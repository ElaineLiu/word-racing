/**
 * ErrorHandler - Error boundaries and graceful degradation
 * Catches errors, logs them, and prevents crashes
 */

import { Events } from './event-bus.js';

// Error types
export const ErrorTypes = {
  INIT: 'init',
  RENDER: 'render',
  PHYSICS: 'physics',
  QUIZ: 'quiz',
  STORAGE: 'storage',
  NETWORK: 'network',
  VALIDATION: 'validation',
};

// Error severity levels
export const Severity = {
  LOW: 'low',       // Recoverable, game continues
  MEDIUM: 'medium', // Feature degraded, game continues
  HIGH: 'high',     // Critical feature failed, may need restart
  FATAL: 'fatal',   // Game cannot continue
};

/**
 * Custom game error class
 */
export class GameError extends Error {
  constructor(type, message, severity = Severity.MEDIUM, cause = null) {
    super(message);
    this.name = 'GameError';
    this.type = type;
    this.severity = severity;
    this.cause = cause;
    this.timestamp = Date.now();
  }
}

/**
 * Error handler singleton
 */
export class ErrorHandler {
  static #eventBus = null;
  static #errors = [];
  static #maxErrors = 50;
  static #onFatal = null;

  /**
   * Initialize error handler
   * @param {EventBus} eventBus
   * @param {Function} onFatal - Callback for fatal errors
   */
  static init(eventBus, onFatal = null) {
    this.#eventBus = eventBus;
    this.#onFatal = onFatal;

    // Global error handler
    window.addEventListener('error', (e) => {
      this.handle(e.error || new Error(e.message), ErrorTypes.INIT);
    });

    // Unhandled promise rejection
    window.addEventListener('unhandledrejection', (e) => {
      this.handle(e.reason, ErrorTypes.INIT);
    });
  }

  /**
   * Handle an error
   * @param {Error|GameError} error
   * @param {string} type - Error type
   * @param {Object} context - Additional context
   */
  static handle(error, type = ErrorTypes.INIT, context = {}) {
    const gameError = error instanceof GameError
      ? error
      : new GameError(type, error.message, Severity.MEDIUM, error);

    // Log to console
    this.#logError(gameError, context);

    // Store for debugging
    this.#errors.push({
      ...gameError,
      context,
    });
    if (this.#errors.length > this.#maxErrors) {
      this.#errors.shift();
    }

    // Emit event
    if (this.#eventBus) {
      this.#eventBus.emit('error:occurred', {
        type: gameError.type,
        severity: gameError.severity,
        message: gameError.message,
      });
    }

    // Handle severity
    switch (gameError.severity) {
      case Severity.FATAL:
        this.#handleFatal(gameError);
        break;
      case Severity.HIGH:
        this.#handleHigh(gameError);
        break;
      default:
        // Low/Medium - already logged, continue
        break;
    }

    return gameError;
  }

  /**
   * Wrap a function with error handling
   * @param {Function} fn
   * @param {string} type
   * @param {*} fallback - Value to return on error
   */
  static wrap(fn, type = ErrorTypes.INIT, fallback = null) {
    return (...args) => {
      try {
        return fn(...args);
      } catch (e) {
        this.handle(e, type);
        return fallback;
      }
    };
  }

  /**
   * Wrap an async function with error handling
   */
  static wrapAsync(fn, type = ErrorTypes.INIT, fallback = null) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (e) {
        this.handle(e, type);
        return fallback;
      }
    };
  }

  /**
   * Create an error boundary for a subsystem
   * @param {string} name
   * @param {Object} subsystem
   */
  static createBoundary(name, subsystem) {
    const boundary = {};

    for (const [key, value] of Object.entries(subsystem)) {
      if (typeof value === 'function') {
        boundary[key] = this.wrap(
          value.bind(subsystem),
          name.toLowerCase(),
          null
        );
      } else {
        boundary[key] = value;
      }
    }

    return boundary;
  }

  /**
   * Get all recorded errors
   */
  static getErrors() {
    return [...this.#errors];
  }

  /**
   * Clear error history
   */
  static clearErrors() {
    this.#errors = [];
  }

  // ==================== Private Methods ====================

  static #logError(error, context) {
    const prefix = `[${error.type.toUpperCase()}]`;
    const severity = `[${error.severity.toUpperCase()}]`;

    if (error.severity === Severity.FATAL || error.severity === Severity.HIGH) {
      console.error(prefix, severity, error.message, error.cause || '', context);
    } else {
      console.warn(prefix, severity, error.message, context);
    }
  }

  static #handleFatal(error) {
    // Show error to user
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #c00;
      color: #fff;
      padding: 16px;
      font-family: monospace;
      z-index: 99999;
      white-space: pre-wrap;
    `;
    errorDiv.textContent = `FATAL ERROR: ${error.message}\n\nPlease refresh the page.`;
    document.body.appendChild(errorDiv);

    // Call fatal callback if provided
    if (this.#onFatal) {
      this.#onFatal(error);
    }
  }

  static #handleHigh(error) {
    // Show warning banner
    const warningDiv = document.createElement('div');
    warningDiv.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: #ff6d00;
      color: #fff;
      padding: 8px 16px;
      font-family: monospace;
      z-index: 99998;
    `;
    warningDiv.textContent = `Warning: ${error.message}`;
    document.body.appendChild(warningDiv);

    // Auto-remove after 5 seconds
    setTimeout(() => warningDiv.remove(), 5000);
  }
}

// ==================== Convenience Functions ====================

/**
 * Assert a condition, throw GameError if false
 */
export function assert(condition, message, type = ErrorTypes.VALIDATION) {
  if (!condition) {
    throw new GameError(type, message, Severity.MEDIUM);
  }
}

/**
 * Try an operation, return fallback on error
 */
export function tryOr(fn, fallback, type = ErrorTypes.INIT) {
  try {
    return fn();
  } catch (e) {
    ErrorHandler.handle(e, type);
    return fallback;
  }
}

/**
 * Try an async operation, return fallback on error
 */
export async function tryAsyncOr(fn, fallback, type = ErrorTypes.NETWORK) {
  try {
    return await fn();
  } catch (e) {
    ErrorHandler.handle(e, type);
    return fallback;
  }
}
