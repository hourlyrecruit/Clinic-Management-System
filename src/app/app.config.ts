import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  provideRouter,
  withInMemoryScrolling,
  withRouterConfig,
  withViewTransitions,
} from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }),
      // Lets a nav link scroll to its section again after the visitor has scrolled away.
      withRouterConfig({ onSameUrlNavigation: 'reload' }),
      // Smooth cross-fade between pages (no-op in browsers without View Transitions).
      withViewTransitions({ skipInitialTransition: true }),
    ),
  ],
};
