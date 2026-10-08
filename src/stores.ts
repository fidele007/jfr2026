import { localStore } from './localStore';

export const filterOptions = localStore("filter-options", {
	filterKeyword: '',
	sortAlphabetically: false,
	onlyVideos: false,
	selectedDate: ''
});

export const mediaHistory = localStore("jfr2025-media-history", []);

export const prefs = localStore("prefs", {
	autoplay: false,
})