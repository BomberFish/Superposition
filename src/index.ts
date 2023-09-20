//bomberfish

// Superposition: Proof-of-concept proxy using Cloudflare Workers.
// Based on https://github.com/aD4wn/Workers-Proxy.

const useHTTPS = true
const disableCloudflareCache = true

addEventListener('fetch', event => {
	event.respondWith(fetchAndApply(event.request));
})


async function fetchAndApply(request) {

	const region = request.headers.get('cf-ipcountry').toUpperCase();
	const ip_address = request.headers.get('cf-connecting-ip');
	const user_agent = request.headers.get('user-agent');

	var response: Response = new Response(null);
	var url = new URL(request.url);
	let url_hostname = url.hostname;

	let params = url.searchParams;

	if (useHTTPS == true) {
		url.protocol = 'https:';
	} else {
		url.protocol = 'http:';
	}

	var urlParam = params.get('url')
	console.log(urlParam)

	if (urlParam == null) {
		urlParam = "https://superposition-landing.bomberfish.ca"
	}

	url = new URL(urlParam);
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
	let original_text: string | undefined = null;
	let response_headers = original_response.headers;
	let new_response_headers = new Headers(response_headers);
	let status = original_response.status;

	if (disableCloudflareCache) {
		new_response_headers.set('Cache-Control', 'no-store');
	}

	new_response_headers.set('access-control-allow-origin', '*');
	new_response_headers.set('access-control-allow-credentials', 'true');
	new_response_headers.delete('content-security-policy');
	new_response_headers.delete('content-security-policy-report-only');
	new_response_headers.delete('clear-site-data');

	if (new_response_headers.get("x-pjax-url")) {
		new_response_headers.set("x-pjax-url", response_headers.get("x-pjax-url").replace("//" + upstream_domain, "//" + url_hostname));
	}

	const content_type = new_response_headers.get('content-type');
	if (content_type != null /*&& content_type.includes('text/html') && content_type.includes('UTF-8')*/) {
		console.log("Replacing reponse text")
		original_text = await replace_response_text(original_response_clone, upstream_domain, url_hostname, url);
	} else {
		console.log("Not replacing response text")
		original_text = original_response_clone.text() as unknown as string;
	}

	response = new Response(original_text, {
		status,
		headers: new_response_headers
	})
	return response;
}

async function replace_response_text(response: Response, upstream_domain: string, host_name: string, fullURL: URL) {
	let text = await response.text()

	var i, j, re;

	console.log("Replace 1")
	i = upstream_domain
	j = host_name + '/?url=https://' + upstream_domain

	re = new RegExp(i, 'g')
	text = text.replace(re, j);
	
	console.log("Replace 2")

	i = "src=\"/"
	j = "src=\"https://" + host_name + "/?url=https://" + upstream_domain + "/"

	re = new RegExp(i, 'g')
	text = text.replace(re, j);

	console.log("Replace 3")

	i = "href=\"/"
	j = "href=\"https://" + host_name + "/?url=https://" + upstream_domain + "/"

	re = new RegExp(i, 'g')
	text = text.replace(re, j);

	console.log("Replace 4")

	i = "src=\"./"
	j = "src=\"https://" + host_name + "/?url=" + fullURL.toString()

	re = new RegExp(i, 'g')
	text = text.replace(re, j);

	console.log("Replace 5")

	i = "href=\"./"
	j = "href=\"https://" + host_name + "/?url=" + fullURL.toString()
	re = new RegExp(i, 'g')
	text = text.replace(re, j);


	return text;
}

async function addButton(text: string) {
	let html = '<div id="superposition-popup"><style>#superposition-popup {font-family: -apple-system, system-ui, sans!important;font-size: 16px!important;position: fixed!important;top: 2%!important;margin-left: 1em;text-align: center!important;float: left!important;padding: 1em!important;border: 1px solid white!important;background: #663399dd!important;border-radius: 100vw!important;backdrop-filter: blur(8px)!important;-webkit-backdrop-filter: blur(8px)!important;-moz-backdrop-filter: blur(8px)!important;line-height: initial;}#superposition-popup,#superposition-popup:hover {transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;}#superposition-popup:hover {padding: 1.1em!important;box-shadow: 0px 0px 69px 0px rgba(102, 51, 153, 0.5)!important;-webkit-box-shadow: 0px 0px 69px 0px rgba(102, 51, 153, 0.5)!important;-moz-box-shadow: 0px 0px 69px 0px rgba(102, 51, 153, 0.5)!important;}#superposition-popup>a,#superposition-popup>a:hover,#superposition-popup>a:visited {text-decoration: none!important;color: white !important;}</style><a href="https://superposition.bomberfish.ca"><?xml version="1.0" encoding="UTF-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="14.5078" height="11.8516"><g><rect height="11.8516" opacity="0" width="14.5078" x="0" y="0"/><path d="M0 5.92188C0 6.11719 0.0859375 6.29688 0.242188 6.44531L5.42969 11.625C5.58594 11.7734 5.75 11.8438 5.9375 11.8438C6.32031 11.8438 6.625 11.5625 6.625 11.1719C6.625 10.9844 6.55469 10.7969 6.42969 10.6797L4.67969 8.89844L1.58594 6.07812L1.42188 6.46094L3.9375 6.61719L13.8203 6.61719C14.2266 6.61719 14.5078 6.32812 14.5078 5.92188C14.5078 5.51562 14.2266 5.22656 13.8203 5.22656L3.9375 5.22656L1.42188 5.38281L1.58594 5.77344L4.67969 2.94531L6.42969 1.16406C6.55469 1.03906 6.625 0.859375 6.625 0.671875C6.625 0.28125 6.32031 0 5.9375 0C5.75 0 5.58594 0.0625 5.41406 0.234375L0.242188 5.39844C0.0859375 5.54688 0 5.72656 0 5.92188Z" fill="#ffffff" fill-opacity="0.85"/></g></svg>&nbsp;&nbsp;Back to Superposition home</a></div>'
	let appendedString = text + html
	return appendedString
}