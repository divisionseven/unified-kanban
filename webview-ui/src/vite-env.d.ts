declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}

declare module "*.css" {
  const classes: { [key: string]: string };
  export = classes;
}
