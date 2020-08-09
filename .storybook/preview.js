if (typeof global.process === "undefined") {
	const { worker } = require("../src/examples/mocks");

	// Start the mocking when each story is loaded.
	// Repetitive calls to the `.start()` method do not register a new worker,
	// but check whether there's an existing once, reusing it, if so.
	worker.start({
		serviceWorker: {
			url: "/rx-query/mockServiceWorker.js",
		},
	});
}
