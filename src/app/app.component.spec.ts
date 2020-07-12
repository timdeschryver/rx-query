import { HttpClientModule } from '@angular/common/http';
import { RouterTestingModule } from '@angular/router/testing';
import {
	render,
	screen,
	waitForElementToBeRemoved,
	configure,
	fireEvent,
} from '@testing-library/angular';

import { AppComponent } from './app.component';
import { routes } from './app-routing.module';
import { CharacterComponent } from './character.component';

beforeEach(() => {
	configure({
		defaultImports: [RouterTestingModule.withRoutes(routes), HttpClientModule],
	});
});

test('Integration', async () => {
	const { navigate } = await render(AppComponent, {
		declarations: [CharacterComponent],
	});

	// loading characters
	expect(screen.getByText(/Loading/i)).toBeVisible();
	await waitForElementToBeRemoved(() => screen.getByText(/Loading/i));

	// Characters loaded
	const characters = screen.getAllByRole('link');
	expect(characters).toHaveLength(4);

	// Navigate to Rick
	await navigate(screen.getByRole('link', { name: /Rick Sanchez/i }));

	// Rick is loading
	expect(screen.getByText(/Loading/i)).toBeVisible();

	// Rick is loaded
	await waitForElementToBeRemoved(() => screen.getByText(/Loading/i));
	expect(screen.getByText(/"id": 1/i)).toBeVisible();

	// Navigate to Morty
	await navigate(screen.getByRole('link', { name: /Morty Smith/i }));

	// Morty is loading
	expect(screen.getByText(/Loading/i)).toBeVisible();
	await waitForElementToBeRemoved(() => screen.getByText(/Loading/i));

	// Morty is loaded
	expect(screen.getByText(/"id": 2/i)).toBeVisible();

	// Navigate back to Rick
	await navigate(screen.getByRole('link', { name: /Rick Sanchez/i }));

	// Rick is loaded from cache so loading doesn't show
	expect(screen.queryByText(/Loading/i)).toBeNull();

	// Navigate to Error
	await navigate(screen.getByRole('link', { name: /Throw an error/i }));

	// Retries to fetch
	await screen.findByText(/Loading ... \(0\)/i);
	await screen.findByText(/Loading ... \(1\)/i, undefined, { timeout: 4100 });
	await screen.findByText(/Loading ... \(2\)/i, undefined, { timeout: 5100 });
	await screen.findByText(/Something went wrong ... \(3\)/i, undefined, {
		timeout: 6100,
	});

	// Refocus re-fetches data
	fireEvent.focus(window);
	await screen.findByText(/Loading ... \(0\)/i);
}, 20000);
