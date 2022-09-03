import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';

import { query, prefetch, refreshQuery } from '../../rx-query';

import { RickAndMortyService } from './rickandmorty.service';

@Component({
	selector: 'app-root',
	template: `
		<ng-container *ngIf="characters$ | async as characters">
			<ng-container [ngSwitch]="characters.status">
				<div *ngSwitchCase="'loading'">
					Loading ... ({{ characters.retries }})
				</div>
				<div *ngSwitchCase="'error'">
					Something went wrong ... ({{ characters.retries }})
				</div>
				<div *ngSwitchDefault>
					<ul>
						<li *ngFor="let character of characters.data">
							<a
								[routerLink]="character.id"
								(mouseenter)="characterPrefetcher.next(character.id)"
								>{{ character.name }}</a
							>
						</li>
						<li>
							<a routerLink="9999" (mouseenter)="characterPrefetcher.next(9999)"
								>Throw an error</a
							>
						</li>
					</ul>
				</div>
			</ng-container>
		</ng-container>
		<router-outlet></router-outlet>

		<rx-query-devtool></rx-query-devtool>
	`,
})
export class AppComponent implements OnInit, OnDestroy {
	destroyer = new Subject<void>();
	characterPrefetcher = new Subject<number>();

	characters$ = query(
		'characters',
		() => this.rickAndMortyService.getCharacters().pipe(map(c => c.results)),
		{
			refetchOnWindowFocus: true,
			staleTime: 10_000,
		},
	);

	constructor(private rickAndMortyService: RickAndMortyService) { }

	ngOnInit(): void {
		prefetch(
			'character',
			this.characterPrefetcher.pipe(takeUntil(this.destroyer)),
			(characterId: number) =>
				this.rickAndMortyService.getCharacter(characterId),
			{
				staleTime: 50000,
			},
		);

		Array.from({ length: 3 }).forEach((_, i) => {
			prefetch(
				'character',
				i + 1,
				(characterId: number) =>
					this.rickAndMortyService.getCharacter(characterId),
				{
					staleTime: 50000,
				},
			);
		})


		setTimeout(() => {
			Array.from({ length: 3 }).forEach((_, i) => {
				refreshQuery(
					'character-' + (i + 1),
				);
			})
		}, 1_000);
	}

	ngOnDestroy(): void {
		this.destroyer.next();
		this.destroyer.complete();
	}
}
