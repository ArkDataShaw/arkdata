import { PubSub, type Message } from '@google-cloud/pubsub';
import * as admin from 'firebase-admin';
import { resolveIdentity } from './resolver';

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Initialize Pub/Sub
const pubsub = new PubSub();
const SUBSCRIPTION_NAME = process.env.SUBSCRIPTION_NAME ?? 'identity-resolution-sub';
const IDENTITY_UPDATES_TOPIC = process.env.IDENTITY_UPDATES_TOPIC ?? 'identity-updates';

interface RawEventMessage {
  tenant_id: string;
  event_id: string;
  pixel_id: string;
  event_type: string;
  url: string;
  event_timestamp: string;
  resolution?: {
    uuid?: string;
    hem_sha256?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    company_name?: string;
    company_domain?: string;
    ip_address?: string;
    user_agent?: string;
    [key: string]: unknown;
  };
}

async function handleMessage(message: Message): Promise<void> {
  try {
    const data: RawEventMessage = JSON.parse(message.data.toString());
    const { tenant_id, event_id, resolution } = data;

    if (!resolution || !tenant_id) {
      message.ack();
      return;
    }

    const result = await resolveIdentity(db, tenant_id, event_id, resolution);

    if (result.matched) {
      // Publish identity update for downstream consumers
      const updateTopic = pubsub.topic(IDENTITY_UPDATES_TOPIC);
      await updateTopic.publishMessage({
        json: {
          tenant_id,
          visitor_id: result.visitor_id,
          match_type: result.match_type,
          confidence: result.confidence,
          event_id,
        },
      });
    }

    message.ack();
  } catch (error) {
    console.error('Error processing message:', error);
    message.nack();
  }
}

async function main() {
  const subscription = pubsub.subscription(SUBSCRIPTION_NAME);

  subscription.on('message', handleMessage);
  subscription.on('error', (error) => {
    console.error('Subscription error:', error);
  });

  console.log(`Identity resolution service listening on ${SUBSCRIPTION_NAME}`);
}

main().catch(console.error);

export { handleMessage };
