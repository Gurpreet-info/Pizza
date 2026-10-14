import type { ReactNode } from "react";
import { usePageMeta } from "../hooks/usePageMeta";

type PolicySectionProps = {
  id: string;
  number: number;
  title: string;
  children: ReactNode;
};

// Replace these two values with the Pizza Offers platform's contact details before publishing.
const PRIVACY_EMAIL = "INSERT_PRIVACY_EMAIL";
const BUSINESS_MAILING_ADDRESS = "INSERT_PIZZA_OFFERS_BUSINESS_MAILING_ADDRESS";

const policyNavigation = [
  ["our-role", "Our role"],
  ["customer-information", "Customer information"],
  ["restaurant-information", "Restaurant information"],
  ["collection", "How we collect information"],
  ["customer-use", "How we use customer information"],
  ["restaurant-use", "How we use restaurant information"],
  ["restaurant-sharing", "Sharing with restaurants"],
  ["other-sharing", "Other sharing"],
  ["consent", "Consent"],
  ["cookies", "Cookies and analytics"],
  ["marketing", "Marketing communications"],
  ["retention", "Retention"],
  ["security", "Security"],
  ["outside-canada", "Processing outside Canada"],
  ["privacy-rights", "Your privacy rights"],
  ["children", "Children's privacy"],
  ["third-parties", "Third-party services"],
  ["changes", "Changes to this policy"],
  ["contact", "Contact"],
] as const;

const customerData = [
  [
    "Contact information",
    "Your name, telephone number, email address, and information included in customer-service requests.",
  ],
  [
    "Order information",
    "Your selected restaurant, menu items, toppings, special instructions, order amount, coupon information, order history, and delivery or pickup preference. Special instructions may include dietary preferences or allergy information that you voluntarily provide.",
  ],
  [
    "Delivery information",
    "Your delivery address, postal code, unit number, buzzer number, delivery instructions, and information needed to confirm whether you are within a restaurant's delivery area.",
  ],
  [
    "Payment information",
    "Online payments may be processed by a third-party payment provider acting for Pizza Offers or the Participating Restaurant. Pizza Offers does not normally receive or store complete credit or debit card numbers. We may receive limited transaction information such as payment status, transaction number, payment method, and the last digits of the payment card.",
  ],
  [
    "Account information",
    "If customer accounts are offered, we may collect your username, encrypted password, saved addresses, favourite restaurants, order history, and account preferences.",
  ],
  [
    "Website and device information",
    "We may automatically collect information such as your IP address, browser, device type, operating system, referring website, pages viewed, approximate location, session times, and interactions with our website.",
  ],
  [
    "Communications and preferences",
    "We may collect reviews, feedback, complaints, support communications, and your choices concerning promotional emails or text messages.",
  ],
] as const;

function PolicySection({ id, number, title, children }: PolicySectionProps) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-gray-200 py-10 first:pt-0 last:border-0">
      <div className="flex items-start gap-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-50 text-sm font-black text-orange-700">
          {number}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-black tracking-tight text-gray-900">{title}</h2>
          <div className="mt-5 space-y-5 text-[1.02rem] leading-8 text-gray-700">{children}</div>
        </div>
      </div>
    </section>
  );
}

function BulletList({ items }: { items: readonly string[] }) {
  return (
    <ul className="ml-1 space-y-2.5" role="list">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3">
          <span aria-hidden="true" className="mt-3 size-1.5 shrink-0 rounded-full bg-orange-600" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PrivacyPolicy() {
  usePageMeta(
    "Privacy Policy",
    "How Pizza Offers collects, uses, and protects personal information for visitors, customers, and restaurant partners.",
    "privacy_policy"
  );

  return (
    <>
      <a
        href="#policy-content"
        className="sr-only z-50 rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to privacy policy
      </a>

      <main id="top" className="min-h-screen bg-gray-50 text-gray-900">
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
          
            <div className="mt-10 max-w-4xl">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-orange-600">
                Legal
              </p>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">
                Privacy Policy
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                This policy explains how Pizza Offers collects, uses, discloses, and protects
                personal information belonging to website visitors, customers, and participating
                restaurant representatives.
              </p>
              <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 text-sm">
                <div>
                  <dt className="font-semibold text-gray-500">Effective date</dt>
                  <dd className="mt-1 font-bold text-gray-900">August 19, 2026</dd>
                </div>
                <div>
                  <dt className="font-semibold text-gray-500">Last updated</dt>
                  <dd className="mt-1 font-bold text-gray-900">August 19, 2026</dd>
                </div>
              </dl>
            </div>
          </div>
        </header>

        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-14 lg:grid-cols-[15rem_minmax(0,1fr)] lg:px-8 lg:py-20">
          <aside className="hidden lg:block">
            <nav aria-label="Privacy policy sections" className="sticky top-8">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">
                On this page
              </p>
              <ol className="mt-5 space-y-1 border-l border-gray-200">
                {policyNavigation.map(([id, label], index) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      className="block border-l-2 border-transparent py-1.5 pl-4 text-sm leading-5 text-gray-600 transition hover:border-orange-600 hover:text-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
                    >
                      {index + 1}. {label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <article id="policy-content" className="min-w-0 rounded-3xl border border-gray-200 bg-white px-5 py-8 shadow-sm sm:px-9 lg:px-12 lg:py-12">
            <div className="border-b border-gray-200 pb-10 text-[1.02rem] leading-8 text-gray-700">
              <p>
                Pizza Offers ("Pizza Offers," "we," "us," or "our") operates{" "}
                <a className="font-semibold text-orange-700 underline decoration-orange-200 underline-offset-4 hover:decoration-orange-600" href="https://pizzaoffers.ca/">
                  pizzaoffers.ca
                </a>
                , an online platform where independent pizza stores and restaurants can publish
                their menus, promote offers, and receive customer orders.
              </p>
              <p className="mt-5">
                In this policy, a pizza store or restaurant available through the platform is
                called a <strong className="font-bold text-gray-900">Participating Restaurant</strong>.
              </p>
            </div>

            <PolicySection id="our-role" number={1} title="Our Role">
              <p>Pizza Offers provides the technology that connects customers with Participating Restaurants.</p>
              <p>
                When you place an order, the Participating Restaurant you select receives the
                information needed to accept, prepare, and fulfil that order. Depending on the
                restaurant's arrangement with Pizza Offers, the restaurant may also process
                payments, arrange delivery, and provide customer support.
              </p>
              <p>
                Participating Restaurants are independently responsible for their food, menus,
                prices, ingredients, order fulfilment, and their own handling of personal
                information. A restaurant may provide an additional privacy notice covering its
                independent privacy practices.
              </p>
            </PolicySection>

            <PolicySection id="customer-information" number={2} title="Information We Collect From Customers">
              <div className="grid gap-4 sm:grid-cols-2">
                {customerData.map(([title, description]) => (
                  <div key={title} className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                    <h3 className="font-bold text-gray-900">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-gray-600">{description}</p>
                  </div>
                ))}
              </div>
            </PolicySection>

            <PolicySection id="restaurant-information" number={3} title="Information We Collect From Participating Restaurants">
              <p>When a restaurant applies to join or uses Pizza Offers, we may collect:</p>
              <BulletList items={[
                "The restaurant's legal and operating names",
                "Business address, telephone number, and email address",
                "Names and contact information of owners or authorized representatives",
                "Menu, pricing, photographs, business hours, and delivery-area information",
                "Business-registration, tax, or verification information",
                "Banking, payment, or settlement information",
                "Restaurant account and login information",
                "Order, refund, and transaction records",
                "Communications with our restaurant-support team",
              ]} />
              <p>
                Restaurant menus, business hours, addresses, telephone numbers, and other listing
                information are normally displayed publicly on the platform.
              </p>
            </PolicySection>

            <PolicySection id="collection" number={4} title="How We Collect Information">
              <p>We collect information when you:</p>
              <BulletList items={[
                "Visit or interact with pizzaoffers.ca",
                "Create an account",
                "Select a restaurant or view a menu",
                "Place or begin placing an order",
                "Request delivery or pickup",
                "Make a payment",
                "Contact Pizza Offers or a Participating Restaurant through the platform",
                "Subscribe to promotional communications",
                "Submit a review, complaint, or support request",
                "Apply to list a restaurant",
                "Manage a Participating Restaurant account",
              ]} />
              <p>
                We may also receive information from Participating Restaurants, payment
                processors, delivery providers, analytics services, advertising platforms, and
                other service providers involved in operating the platform.
              </p>
            </PolicySection>

            <PolicySection id="customer-use" number={5} title="How We Use Customer Information">
              <p>We may use customer information to:</p>
              <BulletList items={[
                "Connect you with the Participating Restaurant you select",
                "Submit, confirm, and manage orders",
                "Process payments, refunds, and order adjustments",
                "Arrange or support delivery and pickup",
                "Confirm addresses and delivery eligibility",
                "Communicate order updates, delays, or problems",
                "Provide customer service",
                "Maintain order and transaction records",
                "Detect fraud, unauthorized transactions, and security incidents",
                "Operate, maintain, and improve the platform",
                "Measure website traffic and advertising performance",
                "Personalize restaurant listings and offers where permitted",
                "Send promotional messages with the required consent",
                "Resolve complaints, chargebacks, and disputes",
                "Enforce our terms and protect our legal rights",
                "Meet legal, accounting, tax, and regulatory obligations",
              ]} />
            </PolicySection>

            <PolicySection id="restaurant-use" number={6} title="How We Use Restaurant Information">
              <p>We may use Participating Restaurant information to:</p>
              <BulletList items={[
                "Review and manage restaurant applications",
                "Create and maintain restaurant listings",
                "Display menus, prices, offers, hours, and locations",
                "Route orders to the appropriate restaurant",
                "Process customer payments and restaurant settlements",
                "Provide restaurant dashboards, reporting, and support",
                "Communicate platform or order updates",
                "Prevent fraud and unauthorized account access",
                "Promote Participating Restaurants and their offers",
                "Calculate commissions, subscription fees, or other charges",
                "Improve platform features",
                "Meet contractual, tax, accounting, and legal requirements",
              ]} />
            </PolicySection>

            <PolicySection id="restaurant-sharing" number={7} title="Sharing Information With Participating Restaurants">
              <p>
                When you place an order, we share relevant information with the Participating
                Restaurant you selected. This may include:
              </p>
              <BulletList items={[
                "Your name and telephone number",
                "Your order and special instructions",
                "Your delivery address and instructions",
                "Your pickup or delivery preference",
                "Payment and transaction status",
                "Communications relating to the order",
              ]} />
              <p>
                The restaurant requires this information to accept, prepare, deliver, or otherwise
                fulfil your order.
              </p>
              <p>
                A Participating Restaurant must not use customer information obtained through Pizza
                Offers for unrelated marketing unless the customer has provided the required
                consent or the use is otherwise permitted by law.
              </p>
              <p>
                If you contact a restaurant directly outside the Pizza Offers platform, that
                restaurant's own privacy practices apply.
              </p>
            </PolicySection>

            <PolicySection id="other-sharing" number={8} title="Other Circumstances in Which We Share Information">
              <p>We may also share information with:</p>
              <BulletList items={[
                "Payment processors and financial institutions",
                "Delivery drivers and delivery-service providers",
                "Website hosting, cloud-storage, and ordering-system providers",
                "Mapping and address-verification providers",
                "Email, telephone, and text-messaging providers",
                "Analytics and advertising providers",
                "Accountants, insurers, lawyers, and other professional advisers",
                "Government agencies, courts, regulators, or law-enforcement authorities when required or permitted by law",
                "A buyer, successor, or adviser involved in a proposed or completed sale, financing, merger, or reorganization of Pizza Offers",
              ]} />
              <p>
                Service providers may use personal information only to provide services to us or as
                otherwise permitted by law.
              </p>
              <p>Pizza Offers does not sell customer personal information.</p>
            </PolicySection>

            <PolicySection id="consent" number={9} title="Consent">
              <p>
                By providing personal information, you consent to its collection, use, and
                disclosure for the purposes described in this policy or identified when the
                information is collected.
              </p>
              <p>
                You may withdraw your consent, subject to reasonable notice and legal or contractual
                restrictions. Withdrawing consent may prevent us from providing certain services.
                For example, your contact and address information may be required to complete a
                delivery order.
              </p>
            </PolicySection>

            <PolicySection id="cookies" number={10} title="Cookies Analytics and Advertising">
              <p>Pizza Offers may use cookies, pixels, and similar technologies to:</p>
              <BulletList items={[
                "Keep the website, account, and shopping cart functioning",
                "Remember preferences",
                "Protect the platform against fraud and misuse",
                "Understand how visitors use the platform",
                "Measure orders and advertising conversions",
                "Improve website performance",
                "Deliver or measure relevant advertising",
              ]} />
              <p>
                We may use services such as Google Analytics and Google Ads. These providers may
                process device and website-usage information under their own privacy policies.
              </p>
              <p>
                You can control or delete cookies through your browser settings. Blocking necessary
                cookies may affect ordering, checkout, or account functions. You may manage
                personalized Google advertising through{" "}
                <a
                  href="https://myadcenter.google.com/"
                  className="font-semibold text-orange-700 underline decoration-orange-200 underline-offset-4 hover:decoration-orange-600"
                >
                  Google's Ad Settings
                </a>
                .
              </p>
              <p>
                Where required, we will request consent before using non-essential analytics or
                advertising technologies.
              </p>
            </PolicySection>

            <PolicySection id="marketing" number={11} title="Marketing Communications">
              <p>
                Pizza Offers may send you promotional emails or text messages about restaurants,
                menu items, or offers when we have your consent or another lawful basis.
              </p>
              <p>
                Promotional messages will identify the sender and include an unsubscribe method.
                You may unsubscribe using the instructions in the message or by contacting us.
              </p>
              <p>
                Participating Restaurants may send their own promotional communications only where
                they have obtained the consent or other lawful authority required to do so.
              </p>
              <p>
                Unsubscribing from promotions will not prevent transactional communications
                concerning active orders, refunds, safety notices, or customer-service requests.
              </p>
            </PolicySection>

            <PolicySection id="retention" number={12} title="Retention of Information">
              <p>We retain personal information only for as long as reasonably necessary to:</p>
              <BulletList items={[
                "Complete the purposes described in this policy",
                "Maintain order, tax, and accounting records",
                "Resolve disputes and chargebacks",
                "Prevent fraud and security incidents",
                "Meet contractual obligations",
                "Comply with applicable laws",
              ]} />
              <p>
                When information is no longer required, we will delete, anonymize, or securely
                destroy it, subject to backup and legal-retention requirements.
              </p>
              <p>
                Participating Restaurants may maintain their own copies of completed order records
                according to their legal and business requirements.
              </p>
            </PolicySection>

            <PolicySection id="security" number={13} title="Security">
              <p>
                We use reasonable administrative, technical, and physical safeguards appropriate to
                the sensitivity of the information. These may include restricted system access,
                password protection, encrypted connections, access logs, and reputable hosting and
                payment providers.
              </p>
              <p>No website, payment system, or internet transmission can be guaranteed to be completely secure.</p>
              <p>
                If a privacy breach creates a real risk of significant harm, Pizza Offers will
                notify affected individuals and relevant authorities as required by applicable law.
              </p>
            </PolicySection>

            <PolicySection id="outside-canada" number={14} title="Processing Outside Canada">
              <p>
                Some of our service providers may store or process information outside Canada,
                including in the United States. Information processed in another country may be
                subject to that country's laws and may be accessible to its courts, governments, or
                law-enforcement authorities.
              </p>
              <p>
                Pizza Offers remains responsible for personal information transferred to service
                providers for processing as required by applicable Canadian privacy law.
              </p>
            </PolicySection>

            <PolicySection id="privacy-rights" number={15} title="Your Privacy Rights">
              <p>Subject to applicable law, you may request to:</p>
              <BulletList items={[
                "Learn whether Pizza Offers holds personal information about you",
                "Access the personal information we hold",
                "Correct inaccurate or incomplete information",
                "Withdraw consent where applicable",
                "Unsubscribe from promotional communications",
                "Close your Pizza Offers account",
                "Raise a concern about our privacy practices",
              ]} />
              <p>
                We may need to verify your identity before responding. Access may be limited where
                disclosure would reveal another person's information, confidential commercial
                information, or information that cannot legally be disclosed.
              </p>
              <p>
                For information held independently by a Participating Restaurant, you may also need
                to contact that restaurant directly.
              </p>
            </PolicySection>

            <PolicySection id="children" number={16} title="Children's Privacy">
              <p>
                Pizza Offers is intended for customers ordering restaurant products and is not
                directed toward children.
              </p>
              <p>
                We do not knowingly collect personal information from children without parent or
                guardian consent where such consent is required. Contact us if you believe a child
                has provided personal information without appropriate consent.
              </p>
            </PolicySection>

            <PolicySection id="third-parties" number={17} title="Third Party Services">
              <p>
                Restaurant pages may contain links to social-media profiles, maps, websites,
                payment services, or delivery providers operated by third parties.
              </p>
              <p>
                Pizza Offers does not control these third parties. Their own terms and privacy
                policies apply when you leave our platform or use their services directly.
              </p>
            </PolicySection>

            <PolicySection id="changes" number={18} title="Changes to This Policy">
              <p>
                We may update this Privacy Policy when our platform, participating restaurants,
                technology, or legal obligations change.
              </p>
              <p>
                The revised version will be posted on this page with an updated Last updated date.
                If a change materially affects how we use personal information, we will provide
                additional notice or request consent where required.
              </p>
            </PolicySection>

            {/* <PolicySection id="contact" number={19} title="Contact the Pizza Offers Privacy Officer">
              <p>Questions, access requests, correction requests, or privacy complaints may be directed to:</p>
              <address className="not-italic rounded-2xl border border-orange-100 bg-orange-50 p-5 text-gray-800">
                <p className="font-black text-gray-900">Privacy Officer - Pizza Offers</p>
                <p className="mt-2">
                  <span className="font-bold">Email:</span> {PRIVACY_EMAIL}
                </p>
                <p>
                  <span className="font-bold">Mailing address:</span> {BUSINESS_MAILING_ADDRESS}
                </p>
                <p>
                  <span className="font-bold">Website:</span>{" "}
                  <a className="font-semibold text-orange-700 underline underline-offset-4" href="https://pizzaoffers.ca/">
                    pizzaoffers.ca
                  </a>
                </p>
              </address>
              <p>
                Please include <strong className="font-bold text-gray-900">Privacy Request</strong>{" "}
                in the subject line and provide enough information for us to understand and respond
                to your request.
              </p>
              <p>
                If you are not satisfied with our response, you may contact or file a complaint
                with the{" "}
                <a
                  href="https://www.priv.gc.ca/en/report-a-concern/"
                  className="font-semibold text-orange-700 underline decoration-orange-200 underline-offset-4 hover:decoration-orange-600"
                >
                  Office of the Privacy Commissioner of Canada
                </a>
                .
              </p>
            </PolicySection> */}

            <div className="pt-8 text-right">
              <a
                href="#top"
                className="inline-flex items-center gap-2 text-sm font-bold text-orange-700 hover:text-orange-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-600"
              >
                Back to top <span aria-hidden="true">↑</span>
              </a>
            </div>
          </article>
        </div>
      </main>
    </>
  );
}
