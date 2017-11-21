const { config } = testHelpers;

const skwell = require( "src/" );
describe( "Bulk Load - Integration", () => {
	let sql;
	before( async () => {
		sql = await skwell.connect( config );
		return sql.execute( sql.fromFile( "sql/bulkLoad-setup.sql" ) );
	} );

	afterEach( async () => {
		await sql.execute( "DELETE FROM BulkLoadTest" );
		await sql.execute( "DROP TABLE IF EXISTS BulkLoadTestNew" );
	} );

	after( () => {
		return sql.dispose();
	} );
	describe( "connection pool", () => {
		it( "should not bulk load a temp table", () => {
			return sql.bulkLoad( "#bulkloadnope", {
				schema: {
					id: {
						type: sql.int,
						nullable: false
					}
				},
				rows: [ { id: 1 } ]
			} ).should.eventually.be.rejectedWith( Error, "Unable to load temp table '#bulkloadnope' using connection pool. Use a transaction instead." );
		} );

		it( "should bulk load a table", async () => {
			await sql.bulkLoad( "BulkLoadTest", {
				schema: {
					id: {
						type: sql.int,
						nullable: true
					}
				},
				rows: [ { id: 1 }, { id: 2 }, { id: 3 } ]
			} );
			const rows = await sql.query( "select * from BulkLoadTest" );
			rows.should.deep.equal( [ { id: 1 }, { id: 2 }, { id: 3 } ] );
		} );

		it( "should create and bulk load a table", async () => {
			await sql.bulkLoad( "BulkLoadTestNew", {
				create: true,
				schema: {
					id: {
						type: sql.int,
						nullable: true
					}
				},
				rows: [ { id: 1 }, { id: 2 }, { id: 3 } ]
			} );
			const rows = await sql.query( "select * from BulkLoadTestNew" );
			rows.should.deep.equal( [ { id: 1 }, { id: 2 }, { id: 3 } ] );
		} );

		it( "should error when bulk loading a missing table without create", async () => {
			return sql.bulkLoad( "BulkLoadTestWontBeThere", {
				schema: {
					id: {
						type: sql.int,
						nullable: true
					}
				},
				rows: [ { id: 1 }, { id: 2 }, { id: 3 } ]
			} ).should.eventually.be.rejectedWith( "Invalid object name 'BulkLoadTestWontBeThere'" );
		} );
	} );

	describe( "transaction", () => {
		it( "should bulk load a temp table", () => {
			return sql.transaction( async tx => {
				await tx.bulkLoad( "#bulkloadyep", {
					create: true,
					schema: {
						id: {
							type: sql.int,
							nullable: false
						}
					},
					rows: [ { id: 1 }, { id: 2 }, { id: 3 } ]
				} );
				const rows = await tx.query( "select * from #bulkloadyep" );
				rows.should.deep.equal( [ { id: 1 }, { id: 2 }, { id: 3 } ] );
			} );
		} );

		it( "should bulk load a table", () => {
			return sql.transaction( async tx => {
				await tx.bulkLoad( "BulkLoadTest", {
					schema: {
						id: {
							type: sql.int,
							nullable: true
						}
					},
					rows: [ { id: 1 }, { id: 2 }, { id: 3 } ]
				} );
				const rows = await tx.query( "select * from BulkLoadTest" );
				rows.should.deep.equal( [ { id: 1 }, { id: 2 }, { id: 3 } ] );
			} );
		} );

		it( "should create and bulk load a table", () => {
			return sql.transaction( async tx => {
				await tx.bulkLoad( "BulkLoadTestNew", {
					create: true,
					schema: {
						id: {
							type: sql.nvarchar,
							nullable: true
						}
					},
					rows: [ { id: "1" }, { id: "2" }, { id: "3" } ]
				} );
				const rows = await tx.query( "select * from BulkLoadTestNew" );
				rows.should.deep.equal( [ { id: "1" }, { id: "2" }, { id: "3" } ] );
			} );
		} );
	} );
} );