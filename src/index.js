//bomberfish

// Superposition: Proof-of-concept proxy using Cloudflare Workers.
// Based on https://github.com/aD4wn/Workers-Proxy.

// Website you intended to retrieve for users.
const upstream = 'duckduckgo.com'

// Custom pathname for the upstream website.
const upstream_path = '/'

// Whether to use HTTPS protocol for upstream address.
const https = true

// Whether to disable cache.
const disable_cache = true

// Replace texts.
const replace_dict = {
	'$upstream': '$custom_domain',
	//'//google.com': ''
}

addEventListener('fetch', event => {
	event.respondWith(fetchAndApply(event.request));
})

async function fetchAndApply(request) {

	const region = request.headers.get('cf-ipcountry').toUpperCase();
	const ip_address = request.headers.get('cf-connecting-ip');
	const user_agent = request.headers.get('user-agent');

	let response = null;
	var url = new URL(request.url);
	let url_hostname = url.hostname;

	let params = url.searchParams;

	if (https == true) {
		url.protocol = 'https:';
	} else {
		url.protocol = 'http:';
	}


	url = new URL(params.get('url'));
	let upstream_domain = url.hostname

	let method = request.method;
	let request_headers = request.headers;
	let new_request_headers = new Headers(request_headers);

	new_request_headers.set('Host', upstream_domain);
	new_request_headers.set('Referer', url.protocol + '//' + url_hostname);
	new_request_headers.set('Access-Control-Allow-Origin', '*');

	let original_response = await fetch(url.href, {
		method: method,
		headers: new_request_headers
	})

	let original_response_clone = original_response.clone();
	let original_text = null;
	let response_headers = original_response.headers;
	let new_response_headers = new Headers(response_headers);
	let status = original_response.status;

	if (disable_cache) {
		new_response_headers.set('Cache-Control', 'no-store');
	}

	new_response_headers.set('access-control-allow-origin', '*');
	new_response_headers.set('access-control-allow-credentials', true);
	new_response_headers.delete('content-security-policy');
	new_response_headers.delete('content-security-policy-report-only');
	new_response_headers.delete('clear-site-data');

	if (new_response_headers.get("x-pjax-url")) {
		new_response_headers.set("x-pjax-url", response_headers.get("x-pjax-url").replace("//" + upstream_domain, "//" + url_hostname));
	}

	const content_type = new_response_headers.get('content-type');
	if (content_type != null && content_type.includes('text/html') && content_type.includes('UTF-8')) {
		original_text = await replace_response_text(original_response_clone, upstream_domain, url_hostname);
	} else {
		original_text = original_response_clone.body
	}

	response = new Response(original_text, {
		status,
		headers: new_response_headers
	})
	return response;
}

async function replace_response_text(response, upstream_domain, host_name) {
	let text = await response.text()

	var i, j;
	for (i in replace_dict) {
		j = replace_dict[i]
		if (i == '$upstream') {
			i = upstream_domain
		} else if (i == '$custom_domain') {
			i = host_name
		}

		if (j == '$upstream') {
			j = upstream_domain
		} else if (j == '$custom_domain') {
			j = host_name
		}

		let re = new RegExp(i, 'g')
		text = text.replace(re, j);
	}
	return text;
}