import { usePageMeta } from '../hooks/usePageMeta';

const customerFeatures = [
  "Discover participating pizza restaurants near you",
  "Browse menus, prices, and current offers",
  "Customize pizzas and other menu items",
  "Choose pickup or delivery where available",
  "Place an order online",
  "Contact the selected restaurant about an order",
];

const restaurantFeatures = [
  "Create a dedicated restaurant page",
  "Display and update menus",
  "Promote exclusive deals",
  "Receive online orders",
  "Set delivery and pickup options",
  "Connect directly with local customers",
];

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="mt-0.5 size-5 shrink-0 text-orange-600"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.25 7.31a1 1 0 0 1-1.42.004l-3.75-3.75a1 1 0 1 1 1.414-1.414l3.04 3.04 6.544-6.598a1 1 0 0 1 1.416-.006Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="mt-7 grid gap-4 sm:grid-cols-2" role="list">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 text-sm leading-6 text-gray-700">
          <CheckIcon />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function AboutUs() {
  usePageMeta(
    'About Us',
    'Learn how Pizza Offers connects local pizza restaurants and customers with menus, deals, and online ordering.',
    'about_us'
  );

  return (
    <>
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <main id="main-content" className="min-h-screen bg-gray-50 text-gray-900">
        <section className="relative isolate overflow-hidden border-b border-gray-200 bg-white">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(circle_at_top_right,rgba(220,38,38,0.13),transparent_55%)]"
          />

          <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-28">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-orange-600">
                About Pizza Offers
              </p>
              <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                Local pizza and great offers in one convenient place
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-gray-600">
                Pizza Offers brings local pizza restaurants and customers together. Participating
                restaurants can publish menus, promote special offers, and receive online orders
                through one easy-to-use platform.
              </p>

              {/* <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/restaurants"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
                >
                  Browse pizza offers
                </a>
                <a
                  href="/list-your-restaurant"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-900 transition hover:border-gray-400 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-700"
                >
                  List your restaurant
                </a>
              </div> */}
            </div>

            <div className="relative mx-auto w-full max-w-xl">
              <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-orange-100/70 blur-2xl" />
              <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-gray-900 p-8 text-white shadow-2xl shadow-gray-900/10 sm:p-10">
                <p className="text-sm font-semibold text-orange-400">One platform</p>
                <p className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                  More choice for customers. More reach for local restaurants.
                </p>
                <div className="mt-9 grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <p className="text-2xl font-black text-white">Local</p>
                    <p className="mt-1 text-sm leading-6 text-gray-400">Restaurants in your area</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <p className="text-2xl font-black text-white">Simple</p>
                    <p className="mt-1 text-sm leading-6 text-gray-400">Menus, deals, and ordering</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-24">
          <div className="grid gap-8 lg:grid-cols-2">
            <article className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm sm:p-10">
              <div className="flex size-11 items-center justify-center rounded-xl bg-orange-50 text-xl font-black text-orange-600">
                01
              </div>
              <h2 className="mt-6 text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
                For customers
              </h2>
              <p className="mt-4 leading-7 text-gray-600">
                Spend less time searching different websites and more time enjoying the pizza you
                love. Compare participating restaurants, check current deals, and order from the
                place that suits you best.
              </p>
              <FeatureList items={customerFeatures} />
            </article>

            <article className="rounded-3xl border border-gray-200 bg-white p-7 shadow-sm sm:p-10">
              <div className="flex size-11 items-center justify-center rounded-xl bg-orange-50 text-xl font-black text-orange-600">
                02
              </div>
              <h2 className="mt-6 text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
                For restaurant owners
              </h2>
              <p className="mt-4 leading-7 text-gray-600">
                Pizza Offers gives independent pizza stores another way to reach local customers,
                promote their best deals, and grow their online business.
              </p>
              <FeatureList items={restaurantFeatures} />
            </article>
          </div>
        </section>

        <section className="bg-gray-900 text-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[0.75fr_1.25fr] lg:px-8 lg:py-24">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-orange-400">
                Our mission
              </p>
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                Make local pizza ordering easier
              </h2>
            </div>
            <div className="space-y-5 text-lg leading-8 text-gray-300">
              <p>
                We help customers discover nearby pizza offers, compare menu options, and order
                from the restaurant that fits their needs.
              </p>
              <p>
                At the same time, we help local pizza restaurants compete and succeed online while
                keeping control of their food, ingredients, prices, business hours, customer
                service, and order fulfilment.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-orange-600">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-7 px-6 py-14 sm:flex-row sm:items-center lg:px-8">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                Ready to find your next pizza deal?
              </h2>
              <p className="mt-2 text-orange-100">
                Explore participating restaurants and their latest offers.
              </p>
            </div>
            <a
              href="/popularpizza-offers"
              className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-bold text-orange-700 shadow-sm transition hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Explore Offers
            </a>
          </div>
        </section>
      </main>
    </>
  );
}
