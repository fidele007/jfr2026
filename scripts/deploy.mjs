import './gh-pages-rm.mjs';
import ghPages from 'gh-pages';
import './check-search-api.mjs';

ghPages.publish('build', { nojekyll: true }, (error) => {
	if (error) {
		console.error(error);
		process.exitCode = 1;
	} else {
		console.log('Published');
	}
});
