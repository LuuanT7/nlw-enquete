type Message = { poll_option_id: string; votes: number };
type Subscriber = (message: Message) => void;

class VoltingPubSub {
  private channels: Record<string, Subscriber[]> = {};

  subscribe(poll_id: string, subscriber: Subscriber) {
    if (!this.channels[poll_id]) {
      this.channels[poll_id] = [];
    }
    this.channels[poll_id].push(subscriber);
  }

  publish(poll_id: string, message: Message) {
    if (!this.channels[poll_id]) {
      return;
    }
    for (const subscriber of this.channels[poll_id]) {
      subscriber(message);
    }
  }
}

export const voting = new VoltingPubSub();
