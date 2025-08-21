import crypto from "crypto";

export function validatePassword(password: string): boolean {
	if (!password || typeof password !== "string") return false;
	const length = password.length >= 8;
	const upper = /[A-Z]/.test(password);
	const lower = /[a-z]/.test(password);
	const number = /\d/.test(password);
	const special = /[^A-Za-z0-9]/.test(password);
	return length && upper && lower && number && special;
}

export function hashPassword(password: string): string {
	const salt = crypto.randomBytes(16).toString("hex");
	const hash = crypto
		.pbkdf2Sync(password, salt, 100000, 64, "sha512")
		.toString("hex");
	return `${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
	if (!stored || typeof stored !== "string") return false;
	const parts = stored.split("$");
	if (parts.length !== 2) return false;
	const [salt, hash] = parts;
	const derived = crypto
		.pbkdf2Sync(password, salt, 100000, 64, "sha512")
		.toString("hex");
	try {
		const a = Buffer.from(derived, "hex");
		const b = Buffer.from(hash, "hex");
		if (a.length !== b.length) return false;
		return crypto.timingSafeEqual(a, b);
	} catch (e) {
		return false;
	}
}
