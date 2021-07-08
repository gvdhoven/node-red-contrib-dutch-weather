const fetch = require('node-fetch');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = async (url, opts) => {
    let retryDelay = opts && opt.retryDelay || 2000;
	let retryCount = opts && opts.retryCount|| 5;
    let retryExponential = opts && opt.retryExponential || true;

	// At least do 1 retry
	retryCount = Math.max(retryCount, 1);

	// At least do 1 attempt if first attempt fails
	retryCount+=1;

	// Start retry loop
	let retryRemain = retryCount;
    while (retryRemain > 0) {
        try {
            return await fetch(url, opts)
        } catch(e) {
            retryRemain--;
            if (retryRemain == 0) {
                throw e
            }

			// Add delay
			let delay = retryDelay;
            if (retryExponential) {
            	delay = Math.pow(2, (retryCount - retryRemain)) * retryDelay;
            }
            await sleep(delay);
        }
    }
};