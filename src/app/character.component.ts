import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { pluck } from 'rxjs/operators';

import { query } from '../../rx-query';

import { RickAndMortyService } from './rickandmorty.service';

@Component({
	selector: 'app-character',
	template: `
		<a routerLink="/">Home</a>
		<ng-container *ngIf="character$ | async as character">
			<ng-container [ngSwitch]="character.state">
				<div *ngSwitchCase="'loading'">
					Loading ... ({{ character.retries }})
				</div>
				<div *ngSwitchCase="'error'">
					Something went wrong ... ({{ character.retries }})
				</div>
				<div *ngSwitchDefault>
					<pre>{{ character.data | json }}</pre>
				</div>
			</ng-container>
		</ng-container>
	`,
})
export class CharacterComponent {
	character$ = query(
		this.activatedRoute.params.pipe(pluck('characterId')),
		(characterId: number) => this.rickAndMortyService.getCharacter(characterId),
		{
			disableCache: false,
			refetchOnWindowFocus: true,
			refetchInterval: 60000,
			retries: (n, error) => n < 3 && error !== 'totally broken',
			retryDelay: (n) => (n + 1) * 1000,
		},
	);

	constructor(
		private rickAndMortyService: RickAndMortyService,
		private activatedRoute: ActivatedRoute,
	) {}
}
