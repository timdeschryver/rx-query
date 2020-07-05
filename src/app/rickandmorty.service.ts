import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { delay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class RickAndMortyService {
  constructor(private http: HttpClient) {}

  getCharacters() {
    return this.http
      .get('https://rickandmortyapi.com/api/character/')
      .pipe(delay(1000));
  }

  getCharacter(characterId: number) {
    return this.http
      .get('https://rickandmortyapi.com/api/character/' + characterId)
      .pipe(delay(300));
  }
}
