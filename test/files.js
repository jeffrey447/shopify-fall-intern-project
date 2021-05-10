// test/files.js

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-http')); // enable http
chai.use(require('chai-as-promised')); // enable tests for promises

const BASE_TEST_URL = 'http://localhost:5000'; // change to base url
describe("Image System", () => {
    describe("Upload Image", () => {
        it("single file", (done) => {
            chai.request(BASE_TEST_URL)
                .post('/api/images/upload')
                .set('Content-Type', 'application/x-www-form-urlencoded')
                .field('Content-Type', 'multipart/form-data')
                .attach('photos', 'test/images/test.gif')
                .then(res => {
                    expect(res).to.have.status(200); // make sure it's a good request
                    expect(res.body).to.have.property('success', true);
                    done();
                })
                .catch(e => done(e));
        }).timeout(10000);

        it("multiple files", (done) => {
            chai.request(BASE_TEST_URL)
                .post('/api/images/upload')
                .set('Content-Type', 'application/x-www-form-urlencoded')
                .field('Content-Type', 'multipart/form-data')
                .attach('photos', 'test/images/test.gif')
                .attach('photos', 'test/images/possum.png')
                .then(res => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('success', true);
                    done();
                })
                .catch(e => done(e));
        }).timeout(10000);

        describe("failed upload", () => {
            it("no image attachment", (done) => {
                chai.request(BASE_TEST_URL)
                    .post('/api/images/upload')
                    .set('Content-Type', 'application/x-www-form-urlencoded')
                    .field('Content-Type', 'multipart/form-data')
                    .then(res => {
                        expect(res).to.have.status(200); // make sure it's a good request
                        expect(res.body).to.have.property('success', false);
                        expect(res.body).to.have.property('message', 'No images provided.');
                        done();
                    })
                    .catch(e => done(e));
            });
        });
    });

    describe("Delete Image", () => {
        it("single delete", (done) => {
            chai.request(BASE_TEST_URL)
                .post('/api/images/upload')
                .set('Content-Type', 'application/x-www-form-urlencoded')
                .field('Content-Type', 'multipart/form-data')
                .attach('photos', 'test/images/test.gif')
                .then(res => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('success', true);
        
                    let id = res.body.file.id;
                    chai.request(BASE_TEST_URL)
                        .delete(`/api/images/i/${id}/`)
                        .then(res => {
                            expect(res).to.have.status(200);
                            expect(res.body).to.have.property('success', true);
                            done();
                        })
                        .catch(e => done(e));
                })
                .catch(e => done(e));
        }).timeout(10000);

        describe("failed delete", () => {
            it("invalid image id", (done) => {
                chai.request(BASE_TEST_URL)
                    .delete('/api/images/i/SOME_FAKE_ID/')
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res.body).to.have.property('success', false); // make sure it's a failed request
                        done();
                    })
                    .catch(e => done(e));
            });
        });
    });

    describe("Image Details", () => {
        it("retrieve", (done) => {
            chai.request(BASE_TEST_URL)
                .post('/api/images/upload')
                .set('Content-Type', 'application/x-www-form-urlencoded')
                .field('Content-Type', 'multipart/form-data')
                .attach('photos', 'test/images/test.gif')
                .then(res => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('success', true);
        
                    let id = res.body.file.id;
                    chai.request(BASE_TEST_URL)
                        .get(`/api/images/i/${id}/`)
                        .then(res => {
                            expect(res).to.have.status(200);
                            expect(res.body).to.have.property('success', true);
                            done();
                        })
                        .catch(e => done(e));
                })
                .catch(e => done(e));
        }).timeout(10000);

        it("retrieve all", (done) => {
            chai.request(BASE_TEST_URL)
                .get('/api/images/')
                .then(res => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('success', true);
                    done();
                })
                .catch(e => done(e));
        });

        describe("failed retrieve", () => {
            it("invalid image id", (done) => {
                chai.request(BASE_TEST_URL)
                    .get('/api/images/i/SOME_FAKE_ID/')
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res.body).to.have.property('success', false); // make sure it's a failed request
                        done();
                    })
                    .catch(e => done(e));
            });
        });
    });

    describe("Download Image", () => {
        it("successful download", (done) => {
            chai.request(BASE_TEST_URL)
                .post('/api/images/upload')
                .set('Content-Type', 'application/x-www-form-urlencoded')
                .field('Content-Type', 'multipart/form-data')
                .attach('photos', 'test/images/test.gif')
                .then(res => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('success', true);
        
                    let id = res.body.file.id;
                    chai.request(BASE_TEST_URL)
                        .get(`/api/images/i/${id}/download`)
                        .then(res => {
                            expect(Buffer.isBuffer(res.body)).to.equal(true);
                            done();
                        })
                        .catch(e => done(e));
                })
                .catch(e => done(e));
        }).timeout(10000);

        describe("failed upload", () => {
            it("invalid image id", (done) => {
                chai.request(BASE_TEST_URL)
                    .get('/api/images/i/test/download')
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res.body).to.have.property('success', false); // make sure it's a failed request
                        done();
                    })
                    .catch(e => done(e));
            });
        });
    });

    describe("Public Status", () => {
        it("change to private", (done) => {
            chai.request(BASE_TEST_URL)
                .post('/api/images/upload')
                .field('Content-Type', 'multipart/form-data')
                .attach('photos', 'test/images/test.gif')
                .then(res => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('success', true);
        
                    let id = res.body.file.id;
                    chai.request(BASE_TEST_URL)
                        .post(`/api/images/i/${id}/set_public`)
                        .set('Content-Type', 'application/json')
                        .send({ public: false })
                        .then(res => {
                            expect(res).to.have.status(200);
                            expect(res.body).to.have.property('success', true);
                            
                            // now check if it actually changed
                            chai.request(BASE_TEST_URL)
                                .get(`/api/images/i/${id}/`)
                                .then(res => {
                                    expect(res).to.have.status(200);
                                    expect(res.body).to.have.property('success', true);
                                    expect(res.body).to.have.property('details');
                                    expect(res.body.details.public).to.equal(false);
                                    done();
                                })
                                .catch(e => done(e));
                        })
                        .catch(e => done(e));
                })
                .catch(e => done(e));
        }).timeout(10000);

        describe("failed public set", () => {
            it("invalid public value", (done) => {
                chai.request(BASE_TEST_URL)
                    .post('/api/images/upload')
                    .field('Content-Type', 'multipart/form-data')
                    .attach('photos', 'test/images/test.gif')
                    .then(res => {
                        expect(res).to.have.status(200);
                        expect(res.body).to.have.property('success', true);
            
                        let id = res.body.file.id;
                        chai.request(BASE_TEST_URL)
                            .post(`/api/images/i/${id}/set_public`)
                            .set('Content-Type', 'application/json')
                            .send({ public: 'some_invalid_value' })
                            .then(res => {
                                expect(res).to.have.status(200);
                                expect(res.body).to.have.property('success', false);
                                done();
                            })
                            .catch(e => done(e));
                    })
                    .catch(e => done(e));
            }).timeout(10000);
        });
    });
});