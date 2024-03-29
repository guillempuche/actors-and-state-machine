import {
  ActorRefFrom,
  assign,
  fromPromise,
  sendParent,
  setup,
  stopChild,
} from "xstate";
import { Ok, Result } from "ts-results";
import invariant from "tiny-invariant";
import { useActor, useSelector } from "@xstate/react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { createBrowserInspector } from "@statelyai/inspect";

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

function getCollectionActorId(id: string) {
  return `collection-${id}`;
}

const authorMachine = setup({
  types: {
    input: {} as AuthorDto,
    context: {} as AuthorDto,
    events: {} as
      | {
          type: "editing.start";
        }
      | {
          type: "editing.cancel";
        }
      | {
          type: "editing.submit";
          fullname: string;
          birthday: string;
        },
  },
}).createMachine({
  id: "Author",
  context: ({ input }) => input,
  initial: "Idle",
  states: {
    Idle: {
      on: {
        "editing.start": {
          target: "Editing",
        },
      },
    },
    Editing: {
      on: {
        "editing.cancel": {
          target: "Idle",
        },
        "editing.submit": {
          target: "Idle",
          actions: assign({
            fullname: ({ event }) => event.fullname,
            birth_date: ({ event }) => event.birthday,
          }),
        },
      },
    },
  },
});

const quoteMachine = setup({
  types: {
    input: {} as QuoteDto,
    context: {} as QuoteDto,
    events: {} as
      | { type: "delete" }
      | {
          type: "editing.start";
        }
      | {
          type: "editing.cancel";
        }
      | {
          type: "editing.submit";
          authorId: string;
          text: string;
          collectionId: string | undefined;
        },
  },
  actors: {
    deleteQuoteFromServer: fromPromise<undefined, { quoteId: string }>(
      async () => {
        await new Promise((res) => setTimeout(res, 1_000));
      }
    ),
  },
}).createMachine({
  id: "Quote",
  context: ({ input }) => input,
  initial: "Idle",
  states: {
    Idle: {
      on: {
        "editing.start": {
          target: "Editing",
        },
        delete: {
          target: "Deleting",
        },
      },
    },
    Editing: {
      on: {
        "editing.cancel": {
          target: "Idle",
        },
        "editing.submit": {
          target: "Idle",
          actions: assign({
            author_id: ({ event }) => event.authorId,
            text: ({ event }) => event.text,
            collections_id: ({ event }) => event.collectionId ?? null,
          }),
        },
      },
    },
    Deleting: {
      invoke: {
        src: "deleteQuoteFromServer",
        input: ({ context }) => ({ quoteId: context.id }),
        onDone: {
          target: "Done",
          actions: sendParent(({ context }) => ({
            type: "quote.delete.confirmed",
            quoteId: context.id,
          })),
        },
      },
    },
    Done: {
      type: "final",
    },
  },
});

const collectionMachine = setup({
  types: {
    context: {} as CollectionDto,
    input: {} as CollectionDto,
    events: {} as
      | {
          type: "editing.start";
        }
      | {
          type: "editing.cancel";
        }
      | {
          type: "editing.submit";
          name: string;
        },
  },
}).createMachine({
  context: ({ input }) => input,
  initial: "Idle",
  states: {
    Idle: {
      on: {
        "editing.start": {
          target: "Editing",
        },
      },
    },
    Editing: {
      on: {
        "editing.cancel": {
          target: "Idle",
        },
        "editing.submit": {
          target: "Idle",
          actions: assign({
            name: ({ event }) => event.name,
          }),
        },
      },
    },
  },
});

const appMachine = setup({
  types: {
    context: {} as {
      quotes: Array<ActorRefFrom<typeof quoteMachine>>;
      authors: Array<ActorRefFrom<typeof authorMachine>>;
      collections: Array<ActorRefFrom<typeof collectionMachine>>;
    },
    events: {} as
      | { type: "quote.delete.confirmed"; quoteId: string }
      | { type: "quote.new.open" }
      | { type: "quote.new.cancel" }
      | {
          type: "quote.new.submit";
          text: string;
          authorId: string;
        }
      | { type: "author.new.open" }
      | { type: "author.new.cancel" }
      | {
          type: "author.new.submit";
          fullname: string;
          birthday: string | undefined;
        },
  },
  actors: {
    authorMachine,
    quoteMachine,
    collectionMachine,
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
            birth_date: "2024-03-29T09:55:30.816Z",
          },
          {
            id: "2",
            fullname: "Redux lover",
            birth_date: "2000-03-29T09:55:30.816Z",
          },
          {
            id: "3",
            fullname: "The nobody guy",
            birth_date: null,
          },
        ],
        quotes: [
          {
            id: "1",
            author_id: "1",
            text: "State machines rock!!!",
            collections_id: "1",
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
            collections_id: "1",
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
        collections: [
          {
            id: "1",
            name: "The best collection ever",
            parent_id: null,
          },
        ],
      });
    }),
    saveNewQuote: fromPromise<undefined, QuoteDto>(async () => {
      await new Promise((res) => setTimeout(res, 1_000));
    }),
    saveNewAuthor: fromPromise<undefined, AuthorDto>(async () => {
      await new Promise((res) => setTimeout(res, 1_000));
    }),
  },
}).createMachine({
  id: "App",
  context: {
    authors: [],
    quotes: [],
    collections: [],
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
              collections: event.output.val.collections.map((collection) =>
                spawn("collectionMachine", {
                  id: getCollectionActorId(collection.id),
                  input: collection,
                  systemId: getCollectionActorId(collection.id),
                })
              ),
            };
          }),
        },
      },
    },
    Ready: {
      type: "parallel",
      states: {
        Authors: {
          initial: "Idle",
          states: {
            Idle: {
              on: {
                "author.new.open": {
                  target: "Creating",
                },
              },
            },
            Creating: {
              initial: "Editing",
              states: {
                Editing: {
                  on: {
                    "author.new.cancel": {
                      target: "Done",
                    },
                    "author.new.submit": {
                      target: "Submitting",
                      actions: assign({
                        authors: ({ context, event, spawn }) => {
                          const newAuthorId = String(Math.random());

                          return context.authors.concat(
                            spawn("authorMachine", {
                              id: getAuthorActorId(newAuthorId),
                              input: {
                                id: newAuthorId,
                                fullname: event.fullname,
                                birth_date: event.birthday ?? null,
                              },
                              systemId: getAuthorActorId(newAuthorId),
                            })
                          );
                        },
                      }),
                    },
                  },
                },
                Submitting: {
                  invoke: {
                    src: "saveNewAuthor",
                    input: ({ context }) => {
                      const lastCreatedAuthor = context.authors
                        .at(-1)
                        ?.getSnapshot().context;
                      invariant(lastCreatedAuthor !== undefined);

                      return lastCreatedAuthor;
                    },
                    onDone: {
                      target: "Done",
                    },
                  },
                },
                Done: {
                  type: "final",
                },
              },
              onDone: {
                target: "Idle",
              },
            },
          },
        },
        Quotes: {
          initial: "Idle",
          states: {
            Idle: {
              on: {
                "quote.new.open": {
                  target: "Creating",
                },
              },
            },
            Creating: {
              initial: "Editing",
              states: {
                Editing: {
                  on: {
                    "quote.new.cancel": {
                      target: "Done",
                    },
                    "quote.new.submit": {
                      target: "Submitting",
                      actions: assign({
                        quotes: ({ context, event, spawn }) => {
                          const newQuoteId = String(Math.random());

                          return context.quotes.concat(
                            spawn("quoteMachine", {
                              id: getQuoteActorId(newQuoteId),
                              input: {
                                id: newQuoteId,
                                author_id: event.authorId,
                                collections_id: null,
                                created_at: new Date().toISOString(),
                                text: event.text,
                              },
                              systemId: getQuoteActorId(newQuoteId),
                            })
                          );
                        },
                      }),
                    },
                  },
                },
                Submitting: {
                  invoke: {
                    src: "saveNewQuote",
                    input: ({ context }) => {
                      const lastCreatedQuote = context.quotes
                        .at(-1)
                        ?.getSnapshot().context;
                      invariant(lastCreatedQuote !== undefined);

                      return lastCreatedQuote;
                    },
                    onDone: {
                      target: "Done",
                    },
                  },
                },
                Done: {
                  type: "final",
                },
              },
              onDone: {
                target: "Idle",
              },
            },
          },
        },
      },
      on: {
        "quote.delete.confirmed": {
          actions: [
            stopChild(({ event }) => getQuoteActorId(event.quoteId)),
            assign({
              quotes: ({ context, event }) =>
                context.quotes.filter(
                  (quote) => quote.id !== getQuoteActorId(event.quoteId)
                ),
            }),
          ],
        },
      },
    },
  },
});

const inspector = createBrowserInspector();

function App() {
  const [snapshot, , appActorRef] = useActor(appMachine, {
    systemId: "App",
    inspect: inspector.inspect,
  });

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
        <div className="rounded-md bg-green-100 px-4 py-2 grid grid-rows-[auto,1fr] max-h-full">
          <h2 className="text-center text-lg font-semibold mb-2">Quotes</h2>

          <div className="overflow-y-auto space-y-2 max-h-full">
            {snapshot.context.quotes.map((quote) => (
              <QuoteItem key={quote.id} actorRef={quote} />
            ))}

            <QuoteNewItemEditor appActorRef={appActorRef} />
          </div>
        </div>
        <div className="rounded-md bg-green-100 px-4 py-2 grid grid-rows-[auto,1fr] max-h-full">
          <h2 className="text-center text-lg font-semibold mb-2">Authors</h2>

          <div className="overflow-y-auto space-y-2 max-h-full">
            {snapshot.context.authors.map((author) => (
              <AuthorItem key={author.id} actorRef={author} />
            ))}

            <AuthorNewItemEditor appActorRef={appActorRef} />
          </div>
        </div>
        <div className="rounded-md bg-green-100 px-4 py-2 grid grid-rows-[auto,1fr]">
          <h2 className="text-center text-lg font-semibold mb-2">
            Collections
          </h2>

          <div className="overflow-y-auto space-y-2">
            {snapshot.context.collections.map((collection) => (
              <CollectionItem key={collection.id} actorRef={collection} />
            ))}
          </div>
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

  const isDeletingQuote = snapshot.matches("Deleting") === true;

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

  const relatedCollectionActorRef =
    snapshot.context.collections_id === null
      ? undefined
      : (actorRef.system.get(
          getCollectionActorId(snapshot.context.collections_id)
        ) as ActorRefFrom<typeof collectionMachine> | undefined);
  const relatedCollectionState = useSelector(
    relatedCollectionActorRef,
    (state) => state
  );

  return (
    <CardItem>
      {snapshot.matches("Editing") === false ? (
        <>
          <p className="pl-2 border-l-4 border-green-600 mb-4 text-gray-900">
            {snapshot.context.text}
          </p>

          <p className="text-gray-600 text-sm mb-2">
            {relatedAuthorState?.context.fullname ?? "-"}{" "}
            {relatedCollectionState === undefined ? null : (
              <>
                {" • Belongs to "}{" "}
                <span className="italic">
                  {relatedCollectionState.context.name}
                </span>{" "}
              </>
            )}
          </p>

          <div className="flex justify-end gap-x-4">
            <button
              className="text-red-700 text-sm font-semibold"
              onClick={() => {
                actorRef.send({
                  type: "delete",
                });
              }}
            >
              {isDeletingQuote === true ? "Deleting..." : "Delete"}
            </button>

            <button
              className="text-green-800 text-sm font-semibold"
              onClick={() => {
                actorRef.send({
                  type: "editing.start",
                });
              }}
            >
              Edit
            </button>
          </div>
        </>
      ) : (
        <QuoteItemEditor
          actorRef={actorRef}
          defaultText={snapshot.context.text}
          defaultAuthor={snapshot.context.author_id ?? undefined}
          defaultCollection={snapshot.context.collections_id ?? undefined}
        />
      )}
    </CardItem>
  );
}

function QuoteItemEditor({
  actorRef,
  defaultText,
  defaultAuthor,
  defaultCollection,
}: {
  actorRef: ActorRefFrom<typeof quoteMachine>;
  defaultText: string;
  defaultAuthor: string | undefined;
  defaultCollection: string | undefined;
}) {
  const appActorRef = actorRef.system.get("App") as ActorRefFrom<
    typeof appMachine
  >;
  const allAuthorRefs = useSelector(
    appActorRef,
    (state) => state.context.authors
  );
  const allCollectionRefs = useSelector(
    appActorRef,
    (state) => state.context.collections
  );

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);

        const authorId = formData.get("author");
        invariant(typeof authorId === "string");

        const text = formData.get("text");
        invariant(typeof text === "string");

        const collectionId = formData.get("collection");
        invariant(typeof collectionId === "string");

        actorRef.send({
          type: "editing.submit",
          authorId,
          text,
          collectionId: collectionId === "" ? undefined : collectionId,
        });
      }}
    >
      <input
        name="text"
        type="text"
        defaultValue={defaultText}
        className="border border-green-600 px-1 py-0.5 rounded mb-4 text-gray-900 w-full"
      />

      <select
        name="author"
        defaultValue={defaultAuthor}
        className="mb-4 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
      >
        {allAuthorRefs.map((authorRef) => {
          return (
            <QuoteItemEditorAuthorOption
              key={authorRef.id}
              authorRef={authorRef}
            />
          );
        })}
      </select>

      <select
        name="collection"
        defaultValue={defaultCollection}
        className="mb-4 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
      >
        <option value="">None</option>

        {allCollectionRefs.map((collectionRef) => {
          return (
            <QuoteItemEditorCollectionOption
              key={collectionRef.id}
              collectionRef={collectionRef}
            />
          );
        })}
      </select>

      <div className="flex justify-end gap-x-4">
        <button
          type="button"
          className="text-green-800 text-sm font-semibold"
          onClick={() => {
            actorRef.send({
              type: "editing.cancel",
            });
          }}
        >
          Cancel
        </button>

        <button type="submit" className="text-green-800 text-sm font-semibold">
          Submit
        </button>
      </div>
    </form>
  );
}

function QuoteNewItemEditor({
  appActorRef,
}: {
  appActorRef: ActorRefFrom<typeof appMachine>;
}) {
  const isCreatingNewQuote = useSelector(
    appActorRef,
    (state) => state.matches({ Ready: { Quotes: "Creating" } }) === true
  );
  const isSavingNewQuote = useSelector(
    appActorRef,
    (state) =>
      state.matches({ Ready: { Quotes: { Creating: "Submitting" } } }) === true
  );

  const allAuthorRefs = useSelector(
    appActorRef,
    (state) => state.context.authors
  );

  return (
    <CardItem>
      {isCreatingNewQuote === true ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();

            const formData = new FormData(event.currentTarget);

            const authorId = formData.get("author");
            invariant(typeof authorId === "string");

            const text = formData.get("text");
            invariant(typeof text === "string");

            appActorRef.send({
              type: "quote.new.submit",
              authorId,
              text,
            });
          }}
        >
          <p className="font-semibold text-sm mb-4 text-gray-900">New Quote</p>

          <input
            type="text"
            name="text"
            required
            placeholder="Text..."
            className="border border-green-600 px-1 py-0.5 rounded mb-4 text-gray-900 w-full"
          />

          <select
            name="author"
            required
            className="mb-4 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
          >
            {allAuthorRefs.map((authorRef) => {
              return (
                <QuoteItemEditorAuthorOption
                  key={authorRef.id}
                  authorRef={authorRef}
                />
              );
            })}
          </select>

          <div className="flex justify-end gap-x-4">
            <button
              className="text-green-800 text-sm font-semibold"
              onClick={() => {
                appActorRef.send({
                  type: "quote.new.cancel",
                });
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="text-green-800 text-sm font-semibold"
            >
              {isSavingNewQuote === true ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex">
          <button
            className="text-green-800 text-sm font-semibold m-auto"
            onClick={() => {
              appActorRef.send({
                type: "quote.new.open",
              });
            }}
          >
            Add quote +
          </button>
        </div>
      )}
    </CardItem>
  );
}

function QuoteItemEditorAuthorOption({
  authorRef,
}: {
  authorRef: ActorRefFrom<typeof authorMachine>;
}) {
  const authorId = useSelector(authorRef, (state) => state.context.id);
  const authorFullname = useSelector(
    authorRef,
    (state) => state.context.fullname
  );

  return <option value={authorId}>{authorFullname}</option>;
}

function QuoteItemEditorCollectionOption({
  collectionRef,
}: {
  collectionRef: ActorRefFrom<typeof collectionMachine>;
}) {
  const collectionId = useSelector(collectionRef, (state) => state.context.id);
  const collectionName = useSelector(
    collectionRef,
    (state) => state.context.name
  );

  return <option value={collectionId}>{collectionName}</option>;
}

function AuthorItem({
  actorRef,
}: {
  actorRef: ActorRefFrom<typeof authorMachine>;
}) {
  const snapshot = useSelector(actorRef, (state) => state);

  return (
    <CardItem>
      {snapshot.matches("Idle") === true ? (
        <>
          <p className="mb-2 text-gray-900">
            {snapshot.context.fullname}{" "}
            <span className="text-gray-500 text-sm">
              (
              {typeof snapshot.context.birth_date !== "string"
                ? "-"
                : new Intl.DateTimeFormat().format(
                    new Date(snapshot.context.birth_date)
                  )}
              )
            </span>
          </p>

          <div className="flex justify-end gap-x-4">
            <button
              className="text-green-800 text-sm font-semibold"
              onClick={() => {
                actorRef.send({
                  type: "editing.start",
                });
              }}
            >
              Edit
            </button>
          </div>
        </>
      ) : (
        <AuthorItemEditor
          actorRef={actorRef}
          defaultFullname={snapshot.context.fullname}
          defaultBirthday={snapshot.context.birth_date ?? undefined}
        />
      )}
    </CardItem>
  );
}

function AuthorItemEditor({
  actorRef,
  defaultFullname,
  defaultBirthday,
}: {
  actorRef: ActorRefFrom<typeof authorMachine>;
  defaultFullname: string;
  defaultBirthday: string | undefined;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);

        const fullname = formData.get("fullname");
        invariant(typeof fullname === "string");

        const birthday = formData.get("birthday");
        invariant(typeof birthday === "string");

        actorRef.send({
          type: "editing.submit",
          fullname,
          birthday,
        });
      }}
    >
      <input
        type="text"
        name="fullname"
        required
        defaultValue={defaultFullname}
        className="border border-green-600 px-1 py-0.5 rounded mb-4 text-gray-900 w-full"
      />

      <input
        type="date"
        name="birthday"
        defaultValue={
          defaultBirthday === undefined
            ? undefined
            : new Date(defaultBirthday).toISOString().split("T")[0]
        }
        className="border border-green-600 px-1 py-0.5 rounded mb-4 text-gray-900 w-full"
      />

      <div className="flex justify-end gap-x-4">
        <button
          type="button"
          className="text-green-800 text-sm font-semibold"
          onClick={() => {
            actorRef.send({
              type: "editing.cancel",
            });
          }}
        >
          Cancel
        </button>

        <button type="submit" className="text-green-800 text-sm font-semibold">
          Submit
        </button>
      </div>
    </form>
  );
}

function AuthorNewItemEditor({
  appActorRef,
}: {
  appActorRef: ActorRefFrom<typeof appMachine>;
}) {
  const isCreatingNewAuthor = useSelector(
    appActorRef,
    (state) => state.matches({ Ready: { Authors: "Creating" } }) === true
  );
  const isSavingNewAuthor = useSelector(
    appActorRef,
    (state) =>
      state.matches({ Ready: { Authors: { Creating: "Submitting" } } }) === true
  );

  return (
    <CardItem>
      {isCreatingNewAuthor === true ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();

            const formData = new FormData(event.currentTarget);

            const fullname = formData.get("fullname");
            invariant(typeof fullname === "string");

            const birthday = formData.get("birthday");
            invariant(typeof birthday === "string");

            appActorRef.send({
              type: "author.new.submit",
              fullname,
              birthday: birthday === "" ? undefined : birthday,
            });
          }}
        >
          <input
            type="text"
            placeholder="Author's name"
            name="fullname"
            required
            className="border border-green-600 px-1 py-0.5 rounded mb-4 text-gray-900 w-full"
          />

          <input
            type="date"
            placeholder="Author's birthday"
            name="birthday"
            className="border border-green-600 px-1 py-0.5 rounded mb-4 text-gray-900 w-full"
          />

          <div className="flex justify-end gap-x-4">
            <button
              type="button"
              className="text-green-800 text-sm font-semibold"
              onClick={() => {
                appActorRef.send({
                  type: "author.new.cancel",
                });
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="text-green-800 text-sm font-semibold"
            >
              {isSavingNewAuthor === true ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex">
          <button
            className="text-green-800 text-sm font-semibold m-auto"
            onClick={() => {
              appActorRef.send({
                type: "author.new.open",
              });
            }}
          >
            Add author +
          </button>
        </div>
      )}
    </CardItem>
  );
}

function CollectionItem({
  actorRef,
}: {
  actorRef: ActorRefFrom<typeof collectionMachine>;
}) {
  const snapshot = useSelector(actorRef, (state) => state);

  return (
    <CardItem>
      {snapshot.matches("Idle") === true ? (
        <>
          <p className="mb-2 text-gray-900">{snapshot.context.name}</p>

          <div className="flex justify-end gap-x-4">
            <button
              className="text-green-800 text-sm font-semibold"
              onClick={() => {
                actorRef.send({
                  type: "editing.start",
                });
              }}
            >
              Edit
            </button>
          </div>
        </>
      ) : (
        <CollectionItemEditor
          actorRef={actorRef}
          defaultName={snapshot.context.name}
        />
      )}
    </CardItem>
  );
}

function CollectionItemEditor({
  actorRef,
  defaultName,
}: {
  actorRef: ActorRefFrom<typeof collectionMachine>;
  defaultName: string;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);

        const name = formData.get("name");
        invariant(typeof name === "string");

        actorRef.send({
          type: "editing.submit",
          name,
        });
      }}
    >
      <input
        type="text"
        name="name"
        required
        defaultValue={defaultName}
        className="border border-green-600 px-1 py-0.5 rounded mb-4 text-gray-900 w-full"
      />

      <div className="flex justify-end gap-x-4">
        <button
          type="button"
          className="text-green-800 text-sm font-semibold"
          onClick={() => {
            actorRef.send({
              type: "editing.cancel",
            });
          }}
        >
          Cancel
        </button>

        <button type="submit" className="text-green-800 text-sm font-semibold">
          Submit
        </button>
      </div>
    </form>
  );
}

function CardItem({ children }: { children: React.ReactNode }) {
  return <div className="p-2 rounded bg-white shadow-md">{children}</div>;
}

export default App;
