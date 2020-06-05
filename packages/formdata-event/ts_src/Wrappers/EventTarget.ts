/**
 * @license
 * Copyright (c) 2020 The Polymer Project Authors. All rights reserved. This
 * code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt The complete set of authors may be
 * found at http://polymer.github.io/AUTHORS.txt The complete set of
 * contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt Code
 * distributed by Google as part of the polymer project is also subject to an
 * additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

import {prototype as EventTargetPrototype, methods as EventTargetMethods} from "../Environment/EventTarget.js";
import {FormDataEvent} from "./FormDataEvent.js";

// Use `WeakMap<K, true>` in place of `WeakSet` for IE11.
const submitListenerInstalled: WeakMap<EventTarget, true> = new WeakMap();
const submitEventSeen: WeakMap<Event, true> = new WeakMap();

const watchFormdataTarget = (subject: EventTarget) => {
  if (submitListenerInstalled.has(subject)) {
    return;
  }
  submitListenerInstalled.set(subject, true);

  EventTargetMethods.addEventListener.call(subject, 'submit', (capturingEvent: Event) => {
    if (submitEventSeen.has(capturingEvent)) {
      return;
    }
    submitEventSeen.set(capturingEvent, true);

    const target = capturingEvent.target;
    if (!(target instanceof HTMLFormElement)) {
      return;
    }

    const submitBubblingListener = (bubblingEvent: Event) => {
      if (bubblingEvent !== capturingEvent) {
        return;
      }

      EventTargetMethods.removeEventListener.call(subject, 'submit', submitBubblingListener);

      if (bubblingEvent.defaultPrevented) {
        return;
      }

      EventTargetMethods.dispatchEvent.call(target, new FormDataEvent('formdata', {
        bubbles: true,
        formData: new FormData(target),
      }));
    };

    EventTargetMethods.addEventListener.call(target.getRootNode(), 'submit', submitBubblingListener);
  }, true);
};

export const install = () => {
  EventTargetPrototype.addEventListener = function(
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions) {
    if (type === 'formdata') {
      watchFormdataTarget(this);
    }

    return EventTargetMethods.addEventListener.call(this, type, listener, options);
  };
};