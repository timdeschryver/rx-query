import { Component } from '@angular/core';
import { pluck } from 'rxjs/operators';

import { createQuery } from '../../create-query';

import { RickAndMortyService } from './rickandmorty.service';

@Component({
  selector: 'app-root',
  template: `
    <ng-container *ngIf="characters$ | async as characters">
      <div *ngIf="characters.status === 'loading'">
        Loading ... ({{ characters.retries }})
      </div>

      <div *ngIf="characters.status === 'error'">
        Something went wrong ... ({{ characters.retries }})
      </div>

      <div
        *ngIf="
          characters.status === 'loading' || characters.status === 'success'
        "
      >
        <ul>
          <li *ngFor="let character of characters.data">
            <a [routerLink]="character.id"> {{ character.name }}</a>
          </li>
          <li>
            <a routerLink="9999">Throw an error</a>
          </li>
        </ul>
      </div>
    </ng-container>
    <router-outlet></router-outlet>
  `,
})
export class AppComponent {
  characters$ = createQuery(
    'characters',
    () => this.rickAndMortyService.getCharacters().pipe(pluck('results')),
    {
      refetchOnWindowFocus: true,
    }
  );
  constructor(private rickAndMortyService: RickAndMortyService) {}
}
