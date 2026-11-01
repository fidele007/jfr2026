<script context="module" lang="ts">
	export const normalizeString = (str: string) => str.normalize('NFD').replace(/\p{Diacritic}/gu, '');

	export const getFriendlyDate = (dateString: string | null | undefined) => {
		if (!dateString) return 'N/A';
		const date = new Date(dateString);
		if (Number.isNaN(date.getTime())) return 'N/A';
		return date.toLocaleDateString('fr-FR', {weekday: 'short', day: '2-digit', month: 'short'});
	}

	export const getTimeEmoji = (time: string) => {
		if (!time) {
			return '🕤'; // Default to a clock emoji if time is invalid
		}

		let simplifiedTime = time;
		const timeArray = time.split(":");
		if (timeArray.length > 1) {
			const calculatedMinute = parseInt(timeArray[1]) >= 30 ? '30' : '00';
			simplifiedTime = `${timeArray[0]}:${calculatedMinute}`;
		}

		switch (simplifiedTime) {
			case '00:00':
			case '12:00':
				return '🕛';
			case '00:30':
			case '12:30':
				return '🕧';
			case '01:00':
			case '13:00':
				return '🕐';
			case '01:30':
			case '13:30':
				return '🕜';
			case '02:00':
			case '14:00':
				return '🕑';
			case '02:30':
			case '14:30':
				return '🕝';
			case '03:00':
			case '15:00':
				return '🕒';
			case '03:30':
			case '15:30':
				return '🕞';
			case '04:00':
			case '16:00':
				return '🕓';
			case '04:30':
			case '16:30':
				return '🕟';
			case '05:00':
			case '17:00':
				return '🕔';
			case '05:30':
			case '17:30':
				return '🕠';
			case '06:00':
			case '18:00':
				return '🕕';
			case '06:30':
			case '18:30':
				return '🕡';
			case '07:00':
			case '19:00':
				return '🕖';
			case '07:30':
			case '19:30':
				return '🕢';
			case '08:00':
			case '20:00':
				return '🕗';
			case '08:30':
			case '20:30':
				return '🕣';
			case '09:00':
			case '21:00':
				return '🕘';
			case '09:30':
			case '21:30':
				return '🕤';
			case '10:00':
			case '22:00':
				return '🕙';
			case '10:30':
			case '22:30':
				return '🕥';
			case '11:00':
			case '23:00':
				return '🕚';
			case '11:30':
			case '23:30':
				return '🕦';
			default:
				return '🕤';
		}
	}

	export const sanitizeFilename = (input: string, replacement: string = "") => {
		if (typeof input !== 'string') {
			throw new Error('Input must be string');
		}

		const illegalRe = /[\/\?<>\\:\*\|"]/g;
		const controlRe = /[\x00-\x1f\x80-\x9f]/g;
		const reservedRe = /^\.+$/;
		const windowsReservedRe = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
		const windowsTrailingRe = /[\. ]+$/;

		const sanitized = input
			.replace(illegalRe, replacement)
			.replace(controlRe, replacement)
			.replace(reservedRe, replacement)
			.replace(windowsReservedRe, replacement)
			.replace(windowsTrailingRe, replacement);

		// Trim text to 255 bytes
		let enc = new TextEncoder();
		let dec = new TextDecoder('utf-8');
		let uint8 = enc.encode(sanitized);
		let section = uint8.slice(0, 255);

		return dec.decode(section);
	};
</script>
