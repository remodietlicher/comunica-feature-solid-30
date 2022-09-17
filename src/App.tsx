import React from "react";
import N3 from "n3";
import { QueryEngine } from "@comunica/query-sparql-solid";
import { QueryStringContext } from "@comunica/types";
import {
  getDefaultSession,
  handleIncomingRedirect,
  login,
  fetch,
} from "@inrupt/solid-client-authn-browser";
import { createSolidDataset, saveSolidDatasetAt } from "@inrupt/solid-client";
import { useEffect, useState } from "react";

const App: React.FC = () => {
  const engine = new QueryEngine();

  const [webId, setWebId] = useState(getDefaultSession().info.webId);
  const [n3Store, setN3Store] = useState(new N3.Store());

  const solidLoginHandler: React.MouseEventHandler = async (e) => {
    e.preventDefault();

    login({
      redirectUrl: window.location.href,
      oidcIssuer: "https://solidcommunity.net",
      clientName: "Test for comunica-feature-solid issue 30",
    });
    setWebId(getDefaultSession().info.webId);
  };

  useEffect(() => {
    // After redirect, the current URL contains login information.
    handleIncomingRedirect({
      restorePreviousSession: true,
    }).then((info) => {
      console.log(info);
      setWebId(getDefaultSession().info.webId);
    });
  }, []);

  console.log(webId);
  const datasetPath = webId ? webId.replace("profile/card#me", "test.ttl") : "";

  const insertQuery = async (query: string, ctx: QueryStringContext) => {
    console.log(query);

    await engine.queryVoid(query, ctx);
  };

  const selectQueryHandler = async (ctx: QueryStringContext) => {
    const selectQuery = `
      SELECT * WHERE {
        ?s ?p ?o.
      }
    `;

    const bindingStream = await engine.queryBindings(selectQuery, ctx);
    const bindings = await bindingStream.toArray();
    bindings.forEach((b: any) =>
      console.log(b?.get("s")?.value, b?.get("p")?.value, b?.get("o")?.value)
    );
  };

  const createEmptySolidDataset = async () => {
    const dataset = createSolidDataset();
    await saveSolidDatasetAt(datasetPath, dataset, { fetch: fetch });
  };

  const knowsQuery = (name: string) => {
    return `INSERT DATA {<https://example.org/ex> <http://xmlns.com/foaf/0.1/knows> "${name}".};`;
  };

  const n3Context: QueryStringContext = {
    sources: [n3Store],
  };

  const solidContext: QueryStringContext = {
    sources: [datasetPath],
    "@comunica/actor-http-inrupt-solid-client-authn:session":
      getDefaultSession(),
  };

  const testQuery = async (ctx: QueryStringContext) => {
    await insertQuery(knowsQuery("Alice"), ctx);
    await insertQuery(knowsQuery("Bob"), ctx);
    await insertQuery(knowsQuery("Charlie"), ctx);

    await selectQueryHandler(ctx);
  };

  const solidTestHandler = async () => {
    await createEmptySolidDataset();

    await testQuery(solidContext);
  };

  const n3TestHandler = async () => {
    setN3Store(new N3.Store());

    await testQuery(n3Context);
  };
  return (
    <>
      <button onClick={solidLoginHandler}>login</button>
      <button onClick={solidTestHandler}>test solid</button>
      <button onClick={n3TestHandler}>test n3</button>
    </>
  );
};

export default App;
