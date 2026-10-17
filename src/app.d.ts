// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	// YouTube IFrame API, loaded at runtime on the session page
	const YT: any;
	interface Window {
		YT?: any;
		onYouTubeIframeAPIReady?: () => void;
	}
}

export {};
