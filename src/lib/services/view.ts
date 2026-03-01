import { Context, Effect, Layer, Option, pipe, Schema } from 'effect';
import { KeyVal } from './key_val';
import { ViewSettings } from '$lib/models/view_settings';

export class ViewPersistenceError extends Schema.TaggedError<ViewPersistenceError>(
	'ViewPersistenceError',
)('ViewPersistenceError', {
	message: Schema.String,
	cause: Schema.Unknown,
}) {}

export class View extends Context.Tag('View')<
	View,
	{
		load_settings(): Effect.Effect<ViewSettings, ViewPersistenceError>;

		save_settings(
			settings: ViewSettings,
		): Effect.Effect<void, ViewPersistenceError>;
	}
>() {
	static layer = Layer.effect(
		View,
		Effect.gen(function* () {
			const keyval = yield* KeyVal;

			const load_settings: (typeof View)['Service']['load_settings'] = () =>
				pipe(
					keyval.get('settings.view', ViewSettings),
					Effect.map(Option.getOrElse(() => ViewSettings.default())),
					Effect.catchTags({
						KeyValError: (error) =>
							Effect.fail(
								ViewPersistenceError.make({
									message: `Unexpected error loading view settings`,
									cause: error,
								}),
							),
						ParseError: (error) =>
							Effect.fail(
								ViewPersistenceError.make({
									message: `Error parsing saved view settings`,
									cause: error,
								}),
							),
					}),
				);

			const save_settings: (typeof View)['Service']['save_settings'] = (
				settings,
			) =>
				pipe(
					Schema.encode(ViewSettings)(settings),
					Effect.flatMap((encoded) => keyval.set(`settings.view`, encoded)),
					Effect.catchTags({
						KeyValError: (error) =>
							Effect.fail(
								ViewPersistenceError.make({
									message: `Unexpected error saving view settings`,
									cause: error,
								}),
							),
						ParseError: (error) =>
							Effect.fail(
								ViewPersistenceError.make({
									message: `Unexpected error saving view settings`,
									cause: error,
								}),
							),
					}),
				);

			return View.of({
				load_settings,
				save_settings,
			});
		}),
	);
}
