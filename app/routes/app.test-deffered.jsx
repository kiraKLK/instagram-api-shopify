// import { defer } from '@remix-run/node';
// import { Await, useLoaderData } from '@remix-run/react';
// import { Suspense } from 'react';

// export const loader = async () => {
//   return defer({
//     ssr: 'I should display on initial SSR',
//     stream: new Promise((res) =>
//       setTimeout(() => res('I should be displayed only after promise resolves'), 3000),
//     ),
//   });
// };

// export default function Tutorial() {
//   const { ssr, stream } = useLoaderData();

//   return (
//     <div>
//       <p>SSR Data: {ssr}</p>
//       <Suspense fallback="Loading stream data...">
//         <Await resolve={stream} errorElement={<p>Failed to load stream data</p>}>
//           {(data) => <p>Stream Data: {data}</p>}
//         </Await>
//       </Suspense>
//     </div>
//   );
// }
import { SaveBar,useAppBridge } from '@shopify/app-bridge-react';
export const loader = async () => {
  return null
};

export default function MyApp() {
  const shopify = useAppBridge();

  const handleDiscard = () => {
    shopify.saveBar.hide('my-save-bar');
  };

  return (
    <>
      <button onClick={() => shopify.saveBar.show('my-save-bar')}>
        Show Save Bar
      </button>
      <SaveBar id="my-save-bar" discardConfirmation>
        <button onClick={() => {handleDiscard()}}>Discard</button>
      </SaveBar>
    </>
  );
}
