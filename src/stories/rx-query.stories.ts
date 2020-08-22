import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { moduleMetadata } from '@storybook/angular';
import { BasicComponent } from '../examples/basic.component';
import { RefreshOnFocusComponent } from '../examples/refresh-on-focus.component';
import { RxQueryDevToolComponent } from '../app/cache-devtool.component';
import { MultipleSubscribersComponent } from '../examples/multiple-subscribers.component';
import { RefreshOnIntervalComponent } from '../examples/refresh-on-interval.component';
import { ErrorComponent } from '../examples/error.component';
import { TypeAheadComponent } from '../examples/typeahead.component';
import { PrefetchComponent } from '../examples/prefetch.component';
import { MutateComponent } from '../examples/mutate.component';

export default {
	title: 'rx-query',
	decorators: [
		moduleMetadata({
			imports: [HttpClientModule, ReactiveFormsModule, CommonModule],
			declarations: [RxQueryDevToolComponent],
		}),
	],
};

export const Basic = () => ({
	component: BasicComponent,
});

Basic.story = {
	name: 'Basic',
};

export const RefreshOnInterval = () => ({
	component: RefreshOnIntervalComponent,
});

RefreshOnInterval.story = {
	name: 'Refresh every second',
};

export const RefreshOnFocus = () => ({
	component: RefreshOnFocusComponent,
});

RefreshOnFocus.story = {
	name: 'Focus to refresh',
};

export const MultipleSubscribers = () => ({
	component: MultipleSubscribersComponent,
});

MultipleSubscribers.story = {
	name: 'Multiple consumers',
};

export const Error = () => ({
	component: ErrorComponent,
});

Error.story = {
	name: 'With retry and error',
};

export const TypeAhead = () => ({
	component: TypeAheadComponent,
});

TypeAhead.story = {
	name: 'Typeahead',
};

export const Prefetch = () => ({
	component: PrefetchComponent,
});

Prefetch.story = {
	name: 'Prefetch',
};

export const Mutate = () => ({
	component: MutateComponent,
});

Mutate.story = {
	name: 'Mutate',
};
