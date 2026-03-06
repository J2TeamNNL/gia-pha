const SQL = require("./node_modules/sql.js/dist/sql-wasm.js");

SQL().then((sql) => {
  const db = new sql.Database();
  db.run("CREATE TABLE test (id TEXT PRIMARY KEY, name TEXT)");
  const res1 = db.exec("SELECT * FROM test");
  console.log("Empty Select:", JSON.stringify(res1));

  db.run("INSERT INTO test VALUES ('1', 'hello')");
  const res2 = db.exec("SELECT * FROM test");
  console.log("1 Row Select:", JSON.stringify(res2));
});
