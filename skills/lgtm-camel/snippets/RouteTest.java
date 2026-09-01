import io.quarkus.test.junit5.QuarkusTest;
import org.apache.camel.builder.AdviceWith;
import org.apache.camel.component.mock.MockEndpoint;
import org.apache.camel.component.kafka.KafkaConstants;
import org.apache.camel.quarkus.test.CamelQuarkusTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

@QuarkusTest
class MyRouteTest extends CamelQuarkusTestSupport {

    @BeforeEach
    void adviseRoute() throws Exception {
        AdviceWith.adviceWith(context, "my-route", advice -> {
            advice.replaceFromWith("direct:test-input");
            advice.weaveById("output").replace().to("mock:output");
        });
    }

    @Test
    void happyPath() throws Exception {
        MockEndpoint output = getMockEndpoint("mock:output");
        output.expectedMessageCount(1);

        template.sendBodyAndHeader("direct:test-input",
            testPayload(), KafkaConstants.KEY, "test-key");

        output.assertIsSatisfied();
    }
}
