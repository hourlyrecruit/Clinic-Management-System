import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-auth-shell',
  imports: [RouterLink, Icon],
  templateUrl: './auth-shell.html',
  styleUrl: './auth-shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthShell {
  readonly asideEyebrow = input('Lumina patient portal');
  readonly asideTitle = input('Dentistry that makes room for your life.');
  readonly asideText = input(
    'Book in under a minute, keep every visit in one place, and reach the same care team you meet in the studio.',
  );
  readonly asidePoints = input<readonly string[]>([
    'Same-week appointments',
    'Your clinician, every time',
    'No payment details needed',
  ]);
  readonly image = input('images/clinic-room.jpg');
  readonly quote = input(
    'First time I have ever left a dental appointment feeling calm. The space feels like a hotel.',
  );
  readonly quoteAuthor = input('Elena R. · patient since 2021');
}
