import {
  Disposable,
  DocumentFilter,
  Extension,
  ExtensionContext,
  extensions,
} from "vscode";

import { LANGUAGE_FILTER } from "./language";
import log from "./log";

const SHELLCHECK_EXTENSION: string = "timonwong.shellcheck";

export interface ShellCheckExtensionApiVersion1 {
  registerDocumentFilter: (documentFilter: DocumentFilter) => Disposable;
}

export class SubscriptionHelper {
  #context: ExtensionContext;
  #firstTry = true;

  constructor(context: ExtensionContext) {
    this.#context = context;
  }

  trySubscribe(): Disposable | null {
    const subscription: Disposable | null = this.#subscribe();

    if (subscription) {
      if (this.#firstTry) {
        log.info("Connected to ShellCheck extension.");
      } else {
        log.info("ShellCheck extension has appeared. Connected.");
      }
    } else {
      if (this.#firstTry) {
        log.info("ShellCheck extension not active.");
      } else {
        log.info("Extensions have changed but still no sign of ShellCheck.");
      }
    }

    this.#firstTry = !!subscription;
    return subscription;
  }

  refresh(subscription: Disposable): Disposable | null {
    if (this.#api()) {
      log.info("Extensions have changed but ShellCheck is still around.");
      return subscription;
    }
    log.info("ShellCheck extension has gone away. Cleaning up.");
    subscription.dispose();
    return null;
  }

  #api(): ShellCheckExtensionApiVersion1 | null {
    const shellCheckExtension: Extension<any> | undefined =
      extensions.getExtension(SHELLCHECK_EXTENSION);

    if (shellCheckExtension && !shellCheckExtension.exports?.apiVersion1) {
      log.error(
        "The ShellCheck extension is active but did not provide an API surface." +
          " Is the ShellCheck extension outdated?",
      );
    }
    return shellCheckExtension?.exports?.apiVersion1;
  }

  #subscribe(): Disposable | null {
    const api: ShellCheckExtensionApiVersion1 | null = this.#api();
    if (!api) {
      return null;
    }

    const subscription: Disposable =
      api.registerDocumentFilter(LANGUAGE_FILTER);
    this.#context.subscriptions.push(subscription);
    return subscription;
  }
}
