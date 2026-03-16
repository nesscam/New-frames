import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonButton, IonIcon } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { take } from 'rxjs/operators';
import { addIcons } from 'ionicons';
import { gridOutline, colorPaletteOutline, heartOutline, personOutline } from 'ionicons/icons';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.page.html',
  styleUrls: ['./landing.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonButton, IonIcon, TranslateModule]
})
export class LandingPage implements OnInit {
  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    addIcons({ gridOutline, colorPaletteOutline, heartOutline, personOutline });
  }

  ngOnInit() {}

  async startCreating() {
    this.authService.isAuthenticated$.pipe(take(1)).subscribe(async (isAuthenticated) => {
      if (isAuthenticated) {
        this.router.navigate(['/home']);
      } else {
        try {
          await this.authService.loginWithGoogle();
          this.router.navigate(['/home']);
        } catch (error) {
          console.error('Login failed', error);
        }
      }
    });
  }
}
