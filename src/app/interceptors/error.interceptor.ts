import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

/**
 * Functional Interceptor to handle HTTP and Firebase/AI API errors.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const translate = inject(TranslateService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = translate.instant('ALERTS.GENERIC_ERROR');

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = `Error: ${error.error.message}`;
      } else if (error.status !== 0) {
        // Server-side error
        errorMessage = `${translate.instant('ALERTS.ERROR')} Code: ${error.status}\nMessage: ${error.message}`;
      }

      console.error(errorMessage);
      // alert(errorMessage); // In a production app, use a ToastController or similar

      return throwError(() => new Error(errorMessage));
    })
  );
};
