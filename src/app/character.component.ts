import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { pluck } from 'rxjs/operators';

import { createQuery } from '../../create-query';

import { RickAndMortyService } from './rickandmorty.service';

@Component({
  selector: 'app-character',
  template: `
    <a routerLink="/">Home</a>
    <ng-container *ngIf="character$ | async as character">
      <div *ngIf="character.status === 'loading'">
        Loading ... ({{ character.retries }})
      </div>

      <div *ngIf="character.status === 'error'">
        Something went wrong ...({{ character.retries }})
      </div>

      <div
        *ngIf="character.status === 'loading' || character.status === 'success'"
      >
        <pre>{{ character.data | json }}</pre>
      </div>
    </ng-container>
  `,
})
export class CharacterComponent {
  character$ = createQuery(
    this.activatedRoute.params.pipe(pluck('characterId')),
    (characterId) => this.rickAndMortyService.getCharacter(characterId),
    {
      disableCache: false,
      refetchOnWindowFocus: true,
      refetchInterval: 60000,
      retries: (n, error) => n < 3 && error !== 'totally broken',
      retryDelay: (n) => (n + 1) * 1000,
    }
  );

  constructor(
    private rickAndMortyService: RickAndMortyService,
    private activatedRoute: ActivatedRoute
  ) {}
}
