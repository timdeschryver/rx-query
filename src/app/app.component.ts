import { Component } from '@angular/core';
import { pluck } from 'rxjs/operators';

import { query } from '../../rx-query';

import { RickAndMortyService } from './rickandmorty.service';

@Component({
	selector: 'app-root',
	template: `
		<ng-container *ngIf="characters$ | async as characters">
			<ng-container [ngSwitch]="characters.state">
				<div *ngSwitchCase="'loading'">
					Loading ... ({{ characters.retries }})
				</div>
				<div *ngSwitchCase="'error'">
					Something went wrong ... ({{ characters.retries }})
				</div>
				<div *ngSwitchDefault>
					<ul>
						<li *ngFor="let character of characters.data">
							<a [routerLink]="character.id">{{ character.name }}</a>
						</li>
						<li>
							<a routerLink="9999">Throw an error</a>
						</li>
					</ul>
				</div>
			</ng-container>
		</ng-container>
		<router-outlet></router-outlet>
	`,
})
export class AppComponent {
	characters$ = query(
		'characters',
		() => this.rickAndMortyService.getCharacters().pipe(pluck('results')),
		{
			refetchOnWindowFocus: true,
		},
	);
	constructor(private rickAndMortyService: RickAndMortyService) {}
}
