import { LegacyCard, EmptyState } from "@shopify/polaris";
import { useAppBridge } from '@shopify/app-bridge-react';
import { useEffect } from 'react';

export async function loader({ request }) {
  return null
}

export default function Index() {
  const shopify = useAppBridge()
  useEffect(() => {
    shopify.loading(false)
  }, [shopify]);
  return (
    <>

      <LegacyCard sectioned>
        <EmptyState
          heading="Manage your inventory transfers"
          action={{ content: 'Add transfer' }}
          secondaryAction={{
            content: 'Learn more',
            url: 'https://help.shopify.com',
          }}
          image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
        >
          <p>Track and receive your incoming inventory from suppliers.</p>
        </EmptyState>
      </LegacyCard>
    </>
  );
}
