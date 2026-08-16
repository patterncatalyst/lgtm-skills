import io.quarkus.test.junit5.QuarkusTest;
import org.apache.camel.builder.AdviceWith;
import org.apache.camel.component.mock.MockEndpoint;
import org.apache.camel.quarkus.test.CamelQuarkusTestSupport;
import org.junit.jupiter.api.Test;

@QuarkusTest
class MyRouteTest extends CamelQuarkusTestSupport {

    @Override
    public boolean isUseAdviceWith() { return true; }

    @Test
    void happyPath() throws Exception {
        AdviceWith.adviceWith(context, "my-route", a -> {
            a.replaceFromWith("direct:test-input");
            a.mockEndpointsAndSkip("kafka:*");
        });
        context.start();

        MockEndpoint output = getMockEndpoint("mock:kafka:output-topic");
        output.expectedMessageCount(1);

        template.sendBodyAndHeader("direct:test-input",
            testPayload(), "kafka.KEY", "test-key");

        output.assertIsSatisfied();
    }

    @Test
    void errorPath_routesToDlq() throws Exception {
        AdviceWith.adviceWith(context, "my-route", a -> {
            a.replaceFromWith("direct:test-input");
            a.mockEndpointsAndSkip("kafka:*");
        });
        context.start();

        MockEndpoint dlq = getMockEndpoint("mock:kafka:my-route.dlq");
        dlq.expectedMessageCount(1);

        template.sendBody("direct:test-input", invalidPayload());

        dlq.assertIsSatisfied();
    }
}
