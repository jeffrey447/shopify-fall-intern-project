// test/user.js

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-http')); // enable http
chai.use(require('chai-as-promised')); // enable tests for promises

const system = require('../util/system');
const BASE_TEST_URL = 'http://localhost:5000'; // change to base url
describe("User System", () => {
    describe("Create User", () => {
        it("single create", (done) => {
            chai.request(BASE_TEST_URL)
                .post('/api/users/register')
                .set('Content-Type', 'application/json')
                .send({ username: system.generateUID() })
                .then(res => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('success', true);
                    done();
                })
                .catch(e => done(e));
        });

        describe("failed create", () => {
            it("no username specified", (done) => {
                chai.request(BASE_TEST_URL)
                    .post('/api/users/register')
                    .set('Content-Type', 'application/json')
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res.body).to.have.property('success', false);
                        done();
                    })
                    .catch(e => done(e));
            });
        });
    });
});