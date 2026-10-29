import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DENTISTS } from '../../../../core/clinic-data';
import { RevealDirective } from '../../../../core/reveal.directive';
import { Icon } from '../../../../shared/icon';

@Component({
  selector: 'app-team-section',
  imports: [RouterLink, Icon, RevealDirective],
  templateUrl: './team.html',
  styleUrl: './team.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamSection {
  protected readonly dentists = DENTISTS;
}
