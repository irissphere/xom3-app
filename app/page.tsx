import { headers } from 'next/headers';
import { HeroSection } from './components/home/HeroSection';
import { EnginesSection } from '../components/home/EnginesSection';
import { OfferSection } from './components/home/OfferSection';
import { CustomBuildSection } from './components/home/CustomBuildSection';
import { FooterSection } from './components/layout/FooterSection';
import { SpaceBaddieLanding } from './components/home/SpaceBaddieLanding';

export default async function HomePage() {
  // Get host header to determine which landing to show
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const cleanHost = host.replace(/^www\\./, '').split(':')[0];

  // SpaceBaddie gets its own landing page
  if (cleanHost === 'spacebaddie.com') {
    return <SpaceBaddieLanding />;
  }

  // Default XOM3 landing
  return (
    <main className="xom3-home">
      <HeroSection />
      <EnginesSection />
      <OfferSection />
      <CustomBuildSection />
      <FooterSection />
    </main>
  );
}