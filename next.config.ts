import { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const config: NextConfig = {
  images: {
    // Next 16 blocks query strings on local images by default. Allow them
    // (any path, any query) so the service photos' "?v=<mtime>" cache-buster
    // works while every other local image keeps loading.
    localPatterns: [{ pathname: '/**' }],
  },
};

export default withNextIntl(config);
