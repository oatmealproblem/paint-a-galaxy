import { Equal, Hash, Schema } from 'effect';
import { SolarSystemId } from './solar_system';

export class Connection
	extends Schema.Class<Connection>('Connection')({
		a: SolarSystemId,
		b: SolarSystemId,
	})
	implements Equal.Equal
{
	get key(): string {
		return [this.a, this.b].sort().toString();
	}

	[Equal.symbol](that: Equal.Equal): boolean {
		if (that instanceof Connection) {
			return (
				(Equal.equals(this.a, that.a) && Equal.equals(this.b, that.b)) ||
				(Equal.equals(this.a, that.b) && Equal.equals(this.b, that.a))
			);
		} else {
			return false;
		}
	}

	[Hash.symbol](): number {
		return Hash.array([this.a, this.b].toSorted());
	}
}
