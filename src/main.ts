import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideStorage, getStorage } from '@angular/fire/storage';
import { provideFunctions, getFunctions } from '@angular/fire/functions';
import { provideAppCheck, initializeAppCheck, ReCaptchaV3Provider } from '@angular/fire/app-check';
import { environment } from './environments/environment';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { errorInterceptor } from './app/interceptors/error.interceptor';

import { HttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader, TRANSLATE_HTTP_LOADER_CONFIG } from '@ngx-translate/http-loader';
import { importProvidersFrom } from '@angular/core';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withInterceptors([errorInterceptor])),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    ...(environment.firebase.apiKey ? [
      provideFirebaseApp(() => initializeApp(environment.firebase)),
      provideAuth(() => getAuth()),
    ] : []),
    ...(environment.firebase.apiKey ? [
      provideFirestore(() => getFirestore()),
      provideStorage(() => getStorage()),
      provideFunctions(() => getFunctions()),
    ] : []),
    // App Check runs in MONITOR mode: enforcement stays off in the Firebase Console until
    // traffic patterns are validated, so a missing/invalid token never blocks a request.
    ...(environment.firebase.apiKey && environment.firebase.appCheckSiteKey ? [
      (() => {
        if (!environment.production) {
          // Lets a developer register a debug token in the Firebase Console instead of
          // solving reCAPTCHA locally. Has no effect in production builds.
          (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
        }
        return provideAppCheck(() => initializeAppCheck(undefined, {
          provider: new ReCaptchaV3Provider(environment.firebase.appCheckSiteKey),
          isTokenAutoRefreshEnabled: true,
        }));
      })(),
    ] : []),
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useClass: TranslateHttpLoader
        },
        defaultLanguage: 'es',
      })
    ),
    {
      provide: TRANSLATE_HTTP_LOADER_CONFIG,
      useValue: {
        prefix: './assets/i18n/',
        suffix: '.json'
      }
    },
  ],
});
