import Git from 'gh-pages/lib/git.js';

// gh-pages 6 expands the old site's paths into a single git rm command.
// Keep each command well below Windows' 32,767-character limit, allowing
// extra room for argument quoting and escaping.
Git.prototype.rm = async function (files) {
	const paths = Array.isArray(files) ? files : [files];
	let batch = [];
	let length = 0;
	for (const file of paths) {
		const cost = file.length * 2 + 3;
		if (batch.length && length + cost > 8000) {
			await this.exec('rm', '--ignore-unmatch', '-r', '-f', '--', ...batch);
			batch = [];
			length = 0;
		}
		batch.push(file);
		length += cost;
	}
	if (batch.length) {
		await this.exec('rm', '--ignore-unmatch', '-r', '-f', '--', ...batch);
	}
	return this;
};
