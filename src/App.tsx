import { ActorRefFrom, assign, fromPromise, setup } from "xstate";
import { Ok, Result } from "ts-results";
import invariant from "tiny-invariant";
import { useActor, useSelector } from "@xstate/react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

interface QuoteDto {
  id: string;
  text: string;
  author_id: string | null;
  collections_id: string | null;
  created_at: string;
}

interface AuthorDto {
  id: string;
  fullname: string;
  birth_date: string | null;
}

interface CollectionDto {
  id: string;
  name: string;
  parent_id: string | null;
}

function getAuthorActorId(id: string) {
  return `author-${id}`;
}

function getQuoteActorId(id: string) {
  return `quote-${id}`;
}

const authorMachine = setup({
  types: {
    input: {} as AuthorDto,
    context: {} as AuthorDto,
  },
}).createMachine({
  id: "Author",
  context: ({ input }) => input,
});

const quoteMachine = setup({
  types: {
    input: {} as QuoteDto,
    context: {} as QuoteDto,
  },
}).createMachine({
  id: "Quote",
  context: ({ input }) => input,
});

const appMachine = setup({
  types: {
    context: {} as {
      quotes: Array<ActorRefFrom<typeof quoteMachine>>;
      authors: Array<ActorRefFrom<typeof authorMachine>>;
    },
  },
  actors: {
    authorMachine,
    quoteMachine,
    getInitialData: fromPromise<
      Result<
        {
          quotes: Array<QuoteDto>;
          authors: Array<AuthorDto>;
          collections: Array<CollectionDto>;
        },
        unknown
      >
    >(async () => {
      await new Promise((res) => setTimeout(res, 2_000));

      return new Ok({
        authors: [
          {
            id: "1",
            fullname: "XState fanboy",
            birth_date: null,
          },
          {
            id: "2",
            fullname: "Redux lover",
            birth_date: null,
          },
        ],
        quotes: [
          {
            id: "1",
            author_id: "1",
            text: "State machines rock!!!",
            collections_id: null,
            created_at: "2024-03-29T09:55:30.816Z",
          },
          {
            id: "2",
            author_id: "1",
            text: "You still haven't looked at XState? You should definitely!",
            collections_id: null,
            created_at: "2024-03-29T09:56:30.816Z",
          },
          {
            id: "3",
            author_id: "1",
            text: "XState is for big applications. XState is for small websites.",
            collections_id: null,
            created_at: "2024-03-29T09:57:30.816Z",
          },
          {
            id: "4",
            author_id: "2",
            text: "XState is for dumb guys; Redux is way better!",
            collections_id: null,
            created_at: "2024-03-29T09:58:30.816Z",
          },
        ],
        collections: [],
      });
    }),
  },
}).createMachine({
  id: "App",
  context: {
    authors: [],
    quotes: [],
  },
  initial: "Loading initial data",
  states: {
    "Loading initial data": {
      invoke: {
        src: "getInitialData",
        onDone: {
          guard: ({ event }) => event.output.ok === true,
          target: "Ready",
          actions: assign(({ event, spawn }) => {
            invariant(event.output.ok === true);

            return {
              authors: event.output.val.authors.map((author) =>
                spawn("authorMachine", {
                  id: getAuthorActorId(author.id),
                  input: author,
                  systemId: getAuthorActorId(author.id),
                })
              ),
              quotes: event.output.val.quotes.map((quote) =>
                spawn("quoteMachine", {
                  id: getQuoteActorId(quote.id),
                  input: quote,
                  systemId: getQuoteActorId(quote.id),
                })
              ),
            };
          }),
        },
      },
    },
    Ready: {},
  },
});

function App() {
  const [snapshot] = useActor(appMachine);

  return (
    <div className="h-full grid grid-rows-[auto,1fr] gap-y-4">
      <div className="flex">
        <h1 className="text-center text-3xl font-bold py-4 flex mx-auto items-center">
          Quote app with actors
          {snapshot.matches("Loading initial data") === true ? (
            <ArrowPathIcon className="animate-spin size-6 text-gray-400 ml-4" />
          ) : null}
        </h1>
      </div>

      <div className="grid grid-cols-3 grid-rows-1 gap-x-4 p-4 mx-auto max-w-7xl w-full">
        <div className="rounded-md bg-green-100 px-4 py-2 grid grid-rows-[auto,1fr]">
          <h2 className="text-center text-lg font-semibold mb-2">Quotes</h2>

          <div className="overflow-y-auto space-y-2">
            {snapshot.context.quotes.map((quote) => (
              <QuoteItem key={quote.id} actorRef={quote} />
            ))}
          </div>
        </div>
        <div className="rounded-md bg-green-100">
          <h2 className="text-center text-lg font-semibold">Authors</h2>
        </div>
        <div className="rounded-md bg-green-100">
          <h2 className="text-center text-lg font-semibold">Collections</h2>
        </div>
      </div>
    </div>
  );
}

function QuoteItem({
  actorRef,
}: {
  actorRef: ActorRefFrom<typeof quoteMachine>;
}) {
  const snapshot = useSelector(actorRef, (state) => state);

  const relatedAuthorActorRef =
    snapshot.context.author_id === null
      ? undefined
      : (actorRef.system.get(getAuthorActorId(snapshot.context.author_id)) as
          | ActorRefFrom<typeof authorMachine>
          | undefined);
  const relatedAuthorState = useSelector(
    relatedAuthorActorRef,
    (state) => state
  );

  return (
    <div className="p-2 rounded bg-white shadow-md">
      <p className="pl-2 border-l-4 border-green-600 mb-4">
        {snapshot.context.text}
      </p>

      <p className="text-gray-600 text-sm">
        {relatedAuthorState?.context.fullname ?? "-"}
      </p>
    </div>
  );
}

export default App;
