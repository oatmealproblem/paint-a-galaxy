import { Context, Effect, Layer, Option, ParseResult, Schema } from 'effect';
import { get, set, del } from 'idb-keyval';

class KeyValError extends Schema.TaggedError<KeyValError>('KeyValError')(
	'KeyValError',
	{
		message: Schema.String,
	},
) {}

export class KeyVal extends Context.Tag('KeyVal')<
	KeyVal,
	{
		get<Decoded, Encoded>(
			key: string,
			schema: Schema.Schema<Decoded, Encoded>,
		): Effect.Effect<
			Option.Option<Decoded>,
			KeyValError | ParseResult.ParseError
		>;

		set<T>(key: string, val: T): Effect.Effect<void, KeyValError>;

		delete(key: string): Effect.Effect<void, KeyValError>;
	}
>() {
	static readonly layer = Layer.succeed(
		KeyVal,
		KeyVal.of({
			get(key, schema) {
				return Effect.tryPromise({
					try: () => get(`paint-a-galaxy.${key}`) as Promise<unknown>,
					catch: (error) => KeyValError.make({ message: `${error}` }),
				}).pipe(Effect.map(Schema.decodeUnknownOption(schema))); // TODO handle parse error
			},

			set(key, val) {
				return Effect.tryPromise({
					try: () => set(`paint-a-galaxy.${key}`, val) as Promise<unknown>,
					catch: (error) => {
						console.error(error);
						return KeyValError.make({ message: `${error}` });
					},
				});
			},

			delete(key) {
				return Effect.tryPromise({
					try: () => del(`paint-a-galaxy.${key}`) as Promise<unknown>,
					catch: (error) => {
						console.error(error);
						return KeyValError.make({ message: `${error}` });
					},
				});
			},
		}),
	);
}
