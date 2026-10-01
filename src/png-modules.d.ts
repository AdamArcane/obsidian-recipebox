/**
 * Type declaration for PNG imports, which esbuild inlines as data URIs.
 */
declare module "*.png" {
	const dataUri: string;
	export default dataUri;
}
