import { experimental_AstroContainer as AstroContainer } from 'astro/container';

type Component = Parameters<AstroContainer['renderToString']>[0];

interface RenderOptions {
  props?: Record<string, unknown>;
  slots?: Record<string, string>;
  /** Path the component is rendered at, so `Astro.url` is meaningful. */
  path?: string;
}

/** Renders an Astro component to an HTML string through Astro's container API. */
export async function render(component: Component, options: RenderOptions = {}): Promise<string> {
  const container = await AstroContainer.create();
  const request = new Request(new URL(options.path ?? '/', 'https://olegs.be'));
  return container.renderToString(component, { props: options.props, slots: options.slots, request });
}
