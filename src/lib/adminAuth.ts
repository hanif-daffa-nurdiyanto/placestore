const STORAGE_KEY = "tp_admin_authed";

export function isAdminAuthed() {
	if (typeof window === "undefined") return false;
	return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function setAdminAuthed(authed: boolean) {
	if (typeof window === "undefined") return;
	if (authed) window.localStorage.setItem(STORAGE_KEY, "1");
	else window.localStorage.removeItem(STORAGE_KEY);
}
