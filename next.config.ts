import { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const config: NextConfig = {
  // В $HOME лежит посторонний package-lock.json, из-за которого Next
  // угадывает корень воркспейса неверно и ругается на сборке. Корень — тут.
  turbopack: { root: __dirname },
  images: {
    // Next 16 blocks query strings on local images by default. Allow them
    // (any path, any query) so the service photos' "?v=<mtime>" cache-buster
    // works while every other local image keeps loading.
    localPatterns: [{ pathname: '/**' }],
  },
};

export default withNextIntl(config);
