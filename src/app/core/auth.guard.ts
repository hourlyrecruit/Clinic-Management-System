import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Role } from './models';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.currentUser();

  if (user) {
    return true;
  }
  return router.createUrlTree(['/signin'], {
    queryParams: { returnUrl: state.url },
  });
};

export function roleGuard(role: Role): CanActivateFn {
  return (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const user = auth.currentUser();

    if (!user) {
      return router.createUrlTree(['/signin'], {
        queryParams: { returnUrl: state.url },
      });
    }
    if (user.role !== role) {
      return router.parseUrl(auth.homePath(user));
    }
    return true;
  };
}

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.currentUser();
  return user ? router.parseUrl(auth.homePath(user)) : true;
};
